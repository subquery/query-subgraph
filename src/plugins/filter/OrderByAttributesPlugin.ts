// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type { PgSelectStep, PgCodec, PgSelectQueryBuilder } from '@dataplan/pg';
import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLNamedType,
  ThunkObjMap,
  GraphQLEnumValueConfig,
} from 'graphql';
import { FieldArg } from 'postgraphile/grafast';
import { makeAssertAllowed } from './utils';

const OrderDirectionFieldName = 'OrderDirection';

export const OrderByAttributesPlugin: GraphileConfig.Plugin = {
  name: 'OrderByAttributesPlugin',
  version: '1.0.0',

  inflection: {
    add: {
      tableOrderByType(options, typeName) {
        return this.upperCamelCase(`${typeName}-order-by`);
      },
    },
  },

  schema: {
    hooks: {
      init: {
        after: ['PgCodecs'],
        callback(_, build) {
          const { EXPORTABLE, inflection, sql } = build;

          for (const pgCodec of build.allPgCodecs) {
            if (!pgCodec.attributes) continue;

            // skip metadata tables
            const nodeTypeName = build.getGraphQLTypeNameByPgCodec(pgCodec, 'output');
            if (!nodeTypeName) continue;

            const orderValues: ThunkObjMap<GraphQLEnumValueConfig> = {};
            const tableOrderByTypeName = inflection.tableOrderByType(nodeTypeName);

            for (const field of Object.keys(pgCodec.attributes)) {
              if (field.startsWith('_')) continue;

              orderValues[inflection.camelCase(field)] = { value: field };
            }

            build.registerEnumType(
              tableOrderByTypeName,
              { isPgRowSortEnum: true },
              () => ({
                name: tableOrderByTypeName,
                values: orderValues,
                description: `order by Enum types.`,
                args: {
                  tableOrderByTypeName,
                },
              }),
              'OrderByAttributesPlugin'
            );
          }

          build.registerEnumType(
            OrderDirectionFieldName,
            { isPgRowSortEnum: true },
            () => ({
              name: OrderDirectionFieldName,
              values: {
                asc: { value: 'ASC' },
                desc: { value: 'DESC' },
              },
              description: `order by direction Enum types.`,
              args: {
                OrderDirectionFieldName,
              },
            }),
            'OrderByAttributesPlugin'
          );

          return _;
        },
      },

      GraphQLObjectType_fields_field_args(args, build, context) {
        const { EXPORTABLE, extend, inflection } = build;
        const {
          Self,
          scope: {
            isPgFieldConnection,
            isPgFieldSimpleCollection,
            pgFieldCodec,
            pgFieldResource: resource,
          },
        } = context;
        const shouldAddFilter = isPgFieldConnection || isPgFieldSimpleCollection;
        if (!shouldAddFilter) return args;

        const codec = (pgFieldCodec ?? resource?.codec) as PgCodec;
        if (!codec) return args;

        const returnCodec = codec;
        const nodeType = build.getGraphQLTypeByPgCodec(returnCodec, 'output') as GraphQLOutputType &
          GraphQLNamedType;
        if (!nodeType) {
          return args;
        }
        const nodeTypeName = nodeType.name;
        const orderByTypeName = inflection.tableOrderByType(nodeTypeName);

        const OrderByType = build.getTypeByName(orderByTypeName) as GraphQLInputType | undefined;
        if (!OrderByType) {
          return args;
        }

        const attributeCodec =
          resource?.parameters && !resource?.codec.attributes ? resource.codec : null;

        const OrderDirectionType = build.getTypeByName(OrderDirectionFieldName) as
          | GraphQLInputType
          | undefined;
        if (!OrderDirectionType) {
          return args;
        }

        const assertAllowed = makeAssertAllowed(build);

        return extend(
          args,
          {
            orderBy: {
              description: 'order by attributes to be used against object types.',
              type: OrderByType,
              applyPlan: EXPORTABLE(
                (attributeCodec) =>
                  function ($parent: any, $pgSelect: PgSelectStep, fieldArgs: any) {
                    $parent._orderField = fieldArgs.getRaw().eval();
                  },

                [attributeCodec]
              ),
            },
            orderDirection: {
              description: 'Specifies the direction in which to order the results.',
              type: OrderDirectionType,
              applyPlan: EXPORTABLE(
                () =>
                  function ($parent: any, $pgSelect: PgSelectStep, fieldArgs: FieldArg) {
                    const orderField = $parent._orderField;
                    if (!orderField) {
                      throw new Error('orderBy field is required');
                    }

                    fieldArgs.apply(
                      $pgSelect,
                      (queryBuilder: PgSelectQueryBuilder, value: 'ASC' | 'DESC'): undefined => {
                        assertAllowed(value, 'object');
                        if (value === null) return;

                        queryBuilder.orderBy({
                          attribute: orderField,
                          direction: value,
                        });
                      }
                    );
                  },

                []
              ),
            },
          },
          `Adding orderBy argument to ${orderByTypeName}`
        );
      },
    },
  },
};
