// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Declare the type
import type { PgCodec, PgCodecWithAttributes, PgSelectStep } from '@dataplan/pg';
import { GraphQLFloat, GraphQLInputObjectType } from 'graphql';
import { makeRangeQuery } from './utils';

declare global {
  namespace GraphileBuild {
    interface Inflection {
      blockHeightType(this: Inflection, typeName: string): string;
    }
    interface ScopeInputObject {
      isPgBlockHeight?: boolean;
    }
    interface ScopeInputObjectFieldsField {
      isPgBlockHeightInputField?: boolean;
    }
    interface Build {
      /**
       * A store of metadata for given codecs. Currently internal as this API
       * may change.
       *
       * @internal
       */
      // https://github.com/graphile/crystal/blob/700a83183144ac4bfbc89b174cec82454b98780e/graphile-build/graphile-build-pg/src/plugins/PgBasicsPlugin.ts#L81
      pgCodecMetaLookup: Map<PgCodec, unknown> /*PgCodecMetaLookup*/;
    }
  }
}

export const PgBlockHeightPlugin: GraphileConfig.Plugin = {
  name: 'PgBlockHeightPlugin',
  description: "Adds the 'blockHeight' argument to connections and lists",

  version: '0.0.1',
  inflection: {
    add: {
      blockHeightType(options, typeName) {
        return this.upperCamelCase(`${typeName}-blockHeight-filter`);
      },
    },
  },

  schema: {
    entityBehavior: {
      pgCodec: ['select', 'filter'],
      pgResource: {
        inferred(behavior, entity) {
          if (entity.parameters) {
            return [behavior];
          }
          return ['filter', behavior];
        },
      },
    },
    hooks: {
      // https://postgraphile.org/postgraphile/next/migrating-from-v4/migrating-custom-plugins/#example
      // register the new block height type
      init(_, build) {
        const { inflection, pgCodecMetaLookup } = build;
        for (const rawCodec of pgCodecMetaLookup.keys()) {
          build.recoverable(null, () => {
            // Ignore scalar codecs
            if (!rawCodec.attributes || rawCodec.isAnonymous) {
              return;
            }
            const codec = rawCodec as PgCodecWithAttributes;

            const tableTypeName = inflection.tableType(codec);
            const blockHeightName = inflection.blockHeightType(tableTypeName);
            /* const TableBlockHeightType = */
            build.registerInputObjectType(
              blockHeightName,
              {
                isPgBlockHeight: true,
                pgCodec: codec,
              },

              () => ({
                description: build.wrapDescription(
                  `A blockHeight to be used against \`${tableTypeName}\` object types.`,
                  'type'
                ),
                fields: {
                  number: { type: GraphQLFloat },
                },
              }),
              `Adding blockHeight type for ${codec.name}.`
            );
          });
        }
        return _;
      },

      // Apply block_range to connection/fields
      GraphQLObjectType_fields_field: {
        callback: (field, build, context) => {
          const { extend } = build;
          const {
            scope: { isPgManyRelationListField, isPgSingleRelationField, isRootQuery },
          } = context;

          if (!(isPgSingleRelationField || isPgManyRelationListField)) {
            return field;
          }
          if (!isRootQuery) {
            if (!field.args) {
              field.args = {};
            }
            field.args = extend(
              field.args,
              {
                connection_block: {
                  description: build.wrapDescription(
                    'Hierarchy block height to be used in determining which block range values should be returned',
                    'arg'
                  ),
                  type: GraphQLFloat,
                  defaultValue: '9223372036854775807',
                  applyPlan: (_, $pgSelect: PgSelectStep, val, four) => {
                    const context = val.getRaw().operationPlan.context;
                    const height = context._block_height;

                    if (!height) {
                      return;
                    }
                    const alias = $pgSelect.alias;
                    const rangeQuery = makeRangeQuery(alias, height, build.sql);
                    $pgSelect.where(rangeQuery);
                  },
                },
              },
              `Adding 'blockRange' field`
            );
          }

          return field;
        },
        provides: ['ClientMutationIdDescription'],
      },

      // Apply block_range to top level entity
      GraphQLObjectType_fields_field_args: (args, build, context) => {
        const { scope } = context;
        const { EXPORTABLE } = build;

        const {
          isPgFieldSimpleCollection,
          isRootQuery,
          pgFieldCodec,
          pgFieldResource: pgResource,
        } = scope;

        const shouldAddCondition = isPgFieldSimpleCollection;

        const codec = pgFieldCodec ?? pgResource?.codec;

        const isSuitableSource = pgResource && pgResource.codec.attributes && !pgResource.isUnique;
        const isSuitableCodec =
          codec &&
          (isSuitableSource || (!pgResource && codec?.polymorphism?.mode === 'union')) &&
          codec.attributes;

        if (!shouldAddCondition || !isSuitableCodec || !isRootQuery) {
          return args;
        }

        if (scope.isPgRowByUniqueConstraintField || scope.isPgFieldConnection) {
          return args;
        }

        const tableTypeName = build.inflection.tableType(codec);
        // Temp implementation to skip metadata tables, wait omit metadata plugin to be implemented
        if (
          tableTypeName === '_Metadatum' ||
          tableTypeName === '_metadata' ||
          tableTypeName === '_meta'
        ) {
          return args;
        }
        const tableBlockHeightTypeName = build.inflection.blockHeightType(tableTypeName);
        //
        const tableBlockHeightType = build.getTypeByName(tableBlockHeightTypeName) as
          | GraphQLInputObjectType
          | undefined;

        if (!tableBlockHeightType) {
          return args;
        }

        return build.extend(
          args,
          {
            block: {
              description: build.wrapDescription(
                'A block height to be used in determining which block range values should be returned',
                'arg'
              ),
              type: tableBlockHeightType,
              applyPlan: EXPORTABLE(
                () =>
                  function (_: unknown, $pgSelect: PgSelectStep, value: any) {
                    const height = build.sql
                      .fragment`${build.sql.value(value.getRaw('number').eval())}::bigint`;
                    const context = value.getRaw().operationPlan.context;
                    context._block_height = height;
                    if (!height) {
                      return;
                    }
                    const alias = $pgSelect.alias;
                    const rangeQuery = makeRangeQuery(alias, height, build.sql);
                    $pgSelect.where(rangeQuery);
                  },
                []
              ),
            },
          },
          `Adding 'blockRange' argument to args`
        );
      },
    },
  },
};
