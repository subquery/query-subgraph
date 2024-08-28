import type { PgConditionStep } from "@dataplan/pg";
import { getFieldDefine, getSupportOperators, Operators } from "./utils";

export const ArgFilterAttributesPlugin: GraphileConfig.Plugin = {
  name: "ArgFilterAttributesPlugin",
  version: "1.0.0",

  schema: {
    hooks: {
      build(build) {
        build.escapeLikeWildcards = build.EXPORTABLE(
          () =>
            function (input) {
              if ("string" !== typeof input) {
                throw new Error(
                  "Non-string input was provided to escapeLikeWildcards"
                );
              } else {
                return input.split("%").join("\\%").split("_").join("\\_");
              }
            },
          []
        );
        return build
      },
      GraphQLInputObjectType_fields(args, build, context) {
        const { sql, EXPORTABLE, escapeLikeWildcards } = build
        const { fieldWithHooks, scope: { isPgConnectionFilter, pgCodec } } = context


        if (!isPgConnectionFilter) return args
        if (!pgCodec?.attributes) return args
        for (const [field, { codec: { name: typeName } }] of Object.entries(pgCodec.attributes)) {
          if (field.startsWith('_')) continue;

          getSupportOperators(typeName).forEach(operator => {
            const fieldDefine = getFieldDefine(build, field, typeName, operator)
            if (!fieldDefine) return

            args = build.extend(args, {
              [fieldDefine.operatorFieldName]: fieldWithHooks({
                fieldName: fieldDefine.operatorFieldName,
              }, {
                type: fieldDefine.type,
                description: "filter condition field",
                inputPlan: EXPORTABLE(
                  (escapeLikeWildcards) => (input) => {
                    return `%${escapeLikeWildcards(input)}%` as any
                  },
                  [escapeLikeWildcards]
                ),
                applyPlan: EXPORTABLE(() => function ($where: PgConditionStep<any>, fieldArgs) {
                  const $input = fieldArgs.getRaw();
                  if ($input.evalIs(undefined)) {
                    return;
                  }

                  let inputValue = $input.eval()
                  if (operator === Operators.CONTAINS || operator === Operators.NOT_CONTAINS) {
                    inputValue = `%${inputValue}%`
                  } else if (operator === Operators.STARTS_WITH || operator === Operators.NOT_STARTS_WITH) {
                    inputValue = `${inputValue}%`
                  } else if (operator === Operators.ENDS_WITH || operator === Operators.NOT_ENDS_WITH) {
                    inputValue = `%${inputValue}`
                  } else if (operator === Operators.CONTAINS_NOCASE || operator === Operators.NOT_CONTAINS_NOCASE) {
                    inputValue = `%${inputValue}%`
                  } else if (operator === Operators.STARTS_WITH_NOCASE || operator === Operators.NOT_STARTS_WITH_NOCASE) {
                    inputValue = `${inputValue}%`
                  } else if (operator === Operators.ENDS_WITH_NOCASE || operator === Operators.NOT_ENDS_WITH_NOCASE) {
                    inputValue = `%${inputValue}`
                  }

                  const tableAlias = $where.alias
                  const sqlIdentifier = sql.identifier(field)
                  const sqlValue = build.sql.value(inputValue)

                  if (operator === Operators.EQUAL_TO) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} = ${sqlValue}`);
                  } else if (operator === Operators.NOT) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} <> ${sqlValue}`);
                  } else if (operator === Operators.GT) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} > ${sqlValue}`);
                  } else if (operator === Operators.GTE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} >= ${sqlValue}`);
                  } else if (operator === Operators.LT) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} < ${sqlValue}`);
                  } else if (operator === Operators.LTE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} <= ${sqlValue}`);
                  } else if (operator === Operators.IN) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} = ANY(${sqlValue})`);
                  } else if (operator === Operators.NOT_IN) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} <> ALL(${sqlValue})`);
                  } else if (operator === Operators.CONTAINS) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} LIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_CONTAINS) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT LIKE ${sqlValue}`);
                  } else if (operator === Operators.STARTS_WITH) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} LIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_STARTS_WITH) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT LIKE ${sqlValue}`);
                  } else if (operator === Operators.ENDS_WITH) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} LIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_ENDS_WITH) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT LIKE ${sqlValue}`);
                  } else if (operator === Operators.CONTAINS_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} ILIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_CONTAINS_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT ILIKE ${sqlValue}`);
                  } else if (operator === Operators.STARTS_WITH_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} ILIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_STARTS_WITH_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT ILIKE ${sqlValue}`);
                  } else if (operator === Operators.ENDS_WITH_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} ILIKE ${sqlValue}`);
                  } else if (operator === Operators.NOT_ENDS_WITH_NOCASE) {
                    $where.where(sql`${tableAlias}.${sqlIdentifier} NOT ILIKE ${sqlValue}`);
                  }
                }, [])
              })
            }, `Adding 'where' argument to args`);
          })
        }

        return args
      },
    },
  },
};
