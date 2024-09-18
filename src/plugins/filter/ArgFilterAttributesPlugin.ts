// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// refer https://github.com/graphile-contrib/postgraphile-plugin-connection-filter/blob/375f125/src/PgConnectionArgFilterAttributesPlugin.ts
import type { PgConditionStep } from '@dataplan/pg';
import { getFieldDefine, getSupportOperators, Operators } from './utils';

export const ArgFilterAttributesPlugin: GraphileConfig.Plugin = {
  name: 'ArgFilterAttributesPlugin',
  version: '1.0.0',

  schema: {
    hooks: {
      build(build) {
        build.escapeLikeWildcards = build.EXPORTABLE(
          () =>
            function (input) {
              if ('string' !== typeof input) {
                throw new Error('Non-string input was provided to escapeLikeWildcards');
              } else {
                return input.split('%').join('\\%').split('_').join('\\_');
              }
            },
          []
        );
        return build;
      },
      GraphQLInputObjectType_fields(args, build, context) {
        const { EXPORTABLE, escapeLikeWildcards, sql } = build;
        const {
          fieldWithHooks,
          scope: { isPgConnectionFilter, pgCodec },
        } = context;

        if (!isPgConnectionFilter) return args;
        if (!pgCodec?.attributes) return args;
        for (const [
          field,
          {
            codec: { name: typeName },
          },
        ] of Object.entries(pgCodec.attributes)) {
          if (field.startsWith('_')) continue;

          getSupportOperators(typeName).forEach((operator) => {
            const fieldDefine = getFieldDefine(build, field, typeName, operator);
            if (!fieldDefine) return;

            args = build.extend(
              args,
              {
                [fieldDefine.operatorFieldName]: fieldWithHooks(
                  {
                    fieldName: fieldDefine.operatorFieldName,
                  },
                  {
                    type: fieldDefine.type,
                    description: 'filter condition field',
                    inputPlan: EXPORTABLE(
                      (escapeLikeWildcards) => (input) => {
                        return `%${escapeLikeWildcards(input)}%` as any;
                      },
                      [escapeLikeWildcards]
                    ),
                    // eslint-disable-next-line complexity
                    applyPlan: EXPORTABLE(
                      () =>
                        /* eslint-disable complexity */
                        function ($where: PgConditionStep<any>, fieldArgs) {
                          const $input = fieldArgs.getRaw();
                          if ($input.evalIs(undefined)) {
                            return;
                          }

                          let inputValue = $input.eval();
                          switch (operator) {
                            case Operators.CONTAINS:
                            case Operators.NOT_CONTAINS:
                            case Operators.CONTAINS_NOCASE:
                            case Operators.NOT_CONTAINS_NOCASE:
                              inputValue = `%${inputValue}%`;
                              break;
                            case Operators.STARTS_WITH:
                            case Operators.NOT_STARTS_WITH:
                            case Operators.STARTS_WITH_NOCASE:
                            case Operators.NOT_STARTS_WITH_NOCASE:
                              inputValue = `${inputValue}%`;
                              break;
                            case Operators.ENDS_WITH:
                            case Operators.NOT_ENDS_WITH:
                            case Operators.ENDS_WITH_NOCASE:
                            case Operators.NOT_ENDS_WITH_NOCASE:
                              inputValue = `%${inputValue}`;
                              break;
                            default:
                              break;
                          }

                          const tableAlias = $where.alias;
                          const sqlIdentifier = sql.identifier(field);
                          const sqlValue = build.sql.value(inputValue);

                          switch (operator) {
                            case Operators.EQUAL_TO:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} = ${sqlValue}`);
                              break;
                            case Operators.NOT:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} <> ${sqlValue}`);
                              break;
                            case Operators.GT:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} > ${sqlValue}`);
                              break;
                            case Operators.GTE:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} >= ${sqlValue}`);
                              break;
                            case Operators.LT:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} < ${sqlValue}`);
                              break;
                            case Operators.LTE:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} <= ${sqlValue}`);
                              break;
                            case Operators.IN:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} = ANY(${sqlValue})`);
                              break;
                            case Operators.NOT_IN:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} <> ALL(${sqlValue})`);
                              break;
                            case Operators.CONTAINS:
                            case Operators.STARTS_WITH:
                            case Operators.ENDS_WITH:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} LIKE ${sqlValue}`);
                              break;
                            case Operators.NOT_CONTAINS:
                            case Operators.NOT_STARTS_WITH:
                            case Operators.NOT_ENDS_WITH:
                              $where.where(
                                sql`${tableAlias}.${sqlIdentifier} NOT LIKE ${sqlValue}`
                              );
                              break;
                            case Operators.CONTAINS_NOCASE:
                            case Operators.STARTS_WITH_NOCASE:
                            case Operators.ENDS_WITH_NOCASE:
                              $where.where(sql`${tableAlias}.${sqlIdentifier} ILIKE ${sqlValue}`);
                              break;
                            case Operators.NOT_CONTAINS_NOCASE:
                            case Operators.NOT_STARTS_WITH_NOCASE:
                            case Operators.NOT_ENDS_WITH_NOCASE:
                              $where.where(
                                sql`${tableAlias}.${sqlIdentifier} NOT ILIKE ${sqlValue}`
                              );
                              break;
                            default:
                              throw new Error(`Unexpected operator: ${operator}`);
                          }
                        },
                      []
                    ),
                  }
                ),
              },
              `Adding 'where' argument to args`
            );
          });
        }

        return args;
      },
    },
  },
};
