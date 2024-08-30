// refer https://github.com/graphile-contrib/postgraphile-plugin-connection-filter/blob/375f125/src/PgConnectionArgFilterBackwardRelationsPlugin.ts 
// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {
  PgConditionStep,
  PgCodecRelation,
  PgCodecWithAttributes,
  PgRegistry,
  PgResource,
} from "@dataplan/pg";
import { makeAssertAllowed } from "./utils";

export const ArgFilterBackwardRelationsPlugin: GraphileConfig.Plugin =
{
  name: "ArgFilterBackwardRelationsPlugin",
  version: '1.0.0',

  inflection: {
    add: {
      filterManyType(preset, table, foreignTable): string {
        return this.upperCamelCase(
          `${this.tableType(table)}-to-many-${this.tableType(
            foreignTable.codec
          )}-filter`
        );
      },
      filterSingleRelationByKeysBackwardsFieldName(preset, fieldName) {
        return fieldName;
      },
      filterManyRelationByKeysFieldName(preset, fieldName) {
        return fieldName;
      },
    },
  },

  schema: {
    hooks: {
      // Registry all possible connections
      init(_, build) {
        const { inflection } = build;
        for (const source of Object.values(
          build.input.pgRegistry.pgResources
        )) {
          if (
            source.parameters ||
            !source.codec.attributes ||
            source.isUnique
          ) {
            continue;
          }
          for (const [relationName, relation] of Object.entries(
            source.getRelations() as {
              [relationName: string]: PgCodecRelation<any, any>;
            }
          )) {
            const foreignTable = relation.remoteResource;
            const filterManyTypeName = inflection.filterManyType(
              source.codec,
              foreignTable
            );
            const foreignTableTypeName = inflection.tableType(
              foreignTable.codec
            );
            if (!build.getTypeMetaByName(filterManyTypeName)) {
              build.recoverable(null, () => {
                build.registerInputObjectType(
                  filterManyTypeName,
                  {
                    foreignTable,
                    isPgConnectionFilterMany: true,
                  },
                  () => ({
                    name: filterManyTypeName,
                    description: `A filter to be used against many \`${foreignTableTypeName}\` object types. All fields are combined with a logical ‘and.’`,
                  }),
                  `ArgFilterBackwardRelationsPlugin: Adding '${filterManyTypeName}' type for ${foreignTable.name}`
                );
              });
            }
          }
        }
        return _;
      },

      GraphQLInputObjectType_fields(inFields, build, context) {
        let fields = inFields;
        const {
          EXPORTABLE,
          extend,
          graphql: { GraphQLBoolean },
          inflection,
          sql,
        } = build;
        const {
          fieldWithHooks,
          scope: {
            isPgConnectionFilter,
            pgCodec,
          },
        } = context;

        const assertAllowed = makeAssertAllowed(build);

        const source =
          pgCodec &&
          (Object.values(build.input.pgRegistry.pgResources).find(
            (s) => s.codec === pgCodec && !s.parameters
          ) as
            | PgResource<any, PgCodecWithAttributes, any, any, PgRegistry>
            | undefined);
        if (isPgConnectionFilter && pgCodec && pgCodec.attributes && source) {
          const backwardsRelations = Object.entries(
            source.getRelations() as {
              [relationName: string]: PgCodecRelation;
            }
          ).filter(([relationName, relation]) => {
            return relation.isReferencee;
          });

          for (const [relationName, relation] of backwardsRelations) {
            const foreignTable = relation.remoteResource; // Deliberate shadowing

            const isOneToMany = !relation.isUnique;

            const foreignTableTypeName = inflection.tableType(
              foreignTable.codec
            );
            const foreignTableFilterTypeName =
              inflection.tableWhereType(foreignTableTypeName);
            const ForeignTableFilterType = build.getTypeByName(
              foreignTableFilterTypeName
            );
            if (!ForeignTableFilterType) continue;

            if (typeof foreignTable.from === "function") {
              continue;
            }
            const foreignTableExpression = foreignTable.from;
            const localAttributes = relation.localAttributes as string[];
            const remoteAttributes = relation.remoteAttributes as string[];

            if (isOneToMany) {
              if (
                build.behavior.pgCodecRelationMatches(relation, "list") ||
                build.behavior.pgCodecRelationMatches(relation, "connection")
              ) {
                const filterManyTypeName = inflection.filterManyType(
                  source.codec,
                  foreignTable
                );
                const FilterManyType =
                  build.getTypeByName(filterManyTypeName);
                // TODO: revisit using `_` prefixed inflector
                const fieldName = inflection._manyRelation({
                  registry: source.registry,
                  codec: source.codec,
                  relationName,
                });
                const filterFieldName =
                  inflection.filterManyRelationByKeysFieldName(fieldName);

                fields = extend(
                  fields,
                  {
                    [filterFieldName]: fieldWithHooks(
                      {
                        fieldName: filterFieldName,
                        isPgConnectionFilterField: true,
                      },
                      () => ({
                        description: `Filter by the object’s \`${fieldName}\` relation.`,
                        type: ForeignTableFilterType,
                        applyPlan: EXPORTABLE(
                          (
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql
                          ) =>
                            function ($where: PgConditionStep<any>, fieldArgs) {
                              assertAllowed(fieldArgs, "object");
                              const $subQuery = $where.existsPlan({
                                tableExpression: foreignTableExpression,
                                alias: foreignTable.name,
                              });
                              localAttributes.forEach((localAttribute, i) => {
                                const remoteAttribute = remoteAttributes[i];
                                $subQuery.where(
                                  sql`${$where.alias}.${sql.identifier(
                                    localAttribute as string
                                  )} = ${$subQuery.alias}.${sql.identifier(
                                    remoteAttribute as string
                                  )}`
                                );
                              });
                              fieldArgs.apply($subQuery);
                            },
                          [
                            assertAllowed,
                            foreignTable,
                            foreignTableExpression,
                            localAttributes,
                            remoteAttributes,
                            sql,
                          ]
                        ),
                      })
                    ),
                  },
                  `Adding connection filter backward relation field from ${source.name} to ${foreignTable.name}`
                );
              }
            } else {
              const fieldName = inflection.singleRelationBackwards({
                registry: source.registry,
                codec: source.codec,
                relationName,
              });
              const filterFieldName =
                inflection.filterSingleRelationByKeysBackwardsFieldName(
                  fieldName
                );
              fields = extend(
                fields,
                {
                  [filterFieldName]: fieldWithHooks(
                    {
                      fieldName: filterFieldName,
                      isPgConnectionFilterField: true,
                    },
                    () => ({
                      description: `Filter by the object’s \`${fieldName}\` relation.`,
                      type: ForeignTableFilterType,
                      applyPlan: EXPORTABLE(
                        (
                          assertAllowed,
                          foreignTable,
                          foreignTableExpression,
                          localAttributes,
                          remoteAttributes,
                          sql
                        ) =>
                          function ($where: PgConditionStep<any>, fieldArgs) {
                            assertAllowed(fieldArgs, "object");
                            const $subQuery = $where.existsPlan({
                              tableExpression: foreignTableExpression,
                              alias: foreignTable.name,
                            });
                            localAttributes.forEach((localAttribute, i) => {
                              const remoteAttribute = remoteAttributes[i];
                              $subQuery.where(
                                sql`${$where.alias}.${sql.identifier(
                                  localAttribute as string
                                )} = ${$subQuery.alias}.${sql.identifier(
                                  remoteAttribute as string
                                )}`
                              );
                            });
                            fieldArgs.apply($subQuery);
                          },
                        [
                          assertAllowed,
                          foreignTable,
                          foreignTableExpression,
                          localAttributes,
                          remoteAttributes,
                          sql,
                        ]
                      ),
                    })
                  ),
                },
                `Adding connection filter backward relation field from ${source.name} to ${foreignTable.name}`
              );
            }
          }
        }

        return fields;
      },
    },
  },
};
