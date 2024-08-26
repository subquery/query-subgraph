import type { PgConditionStep } from "@dataplan/pg";

export const ArgFilterLogicalOperatorsPlugin: GraphileConfig.Plugin =
{
  name: "ArgFilterLogicalOperatorsPlugin",
  version: '1.0.0',

  schema: {
    hooks: {
      GraphQLInputObjectType_fields(fields, build, context) {
        const {
          extend,
          graphql: { GraphQLList, GraphQLNonNull },
          EXPORTABLE,
        } = build;
        const {
          fieldWithHooks,
          scope: { isPgConnectionFilter },
          Self,
        } = context;

        if (!isPgConnectionFilter) return fields;

        if (Object.keys(fields).length === 0) {
          // Skip adding these operators if they would be the only fields
          return fields;
        }

        const logicalOperatorFields = {
          and: fieldWithHooks(
            {
              fieldName: "and",
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: `Checks for all expressions in this list.`,
              type: new GraphQLList(new GraphQLNonNull(Self)),
              applyPlan: EXPORTABLE(
                () =>
                  function ($where: PgConditionStep<any>, fieldArgs) {
                    const $and = $where.andPlan();
                    // No need for this more correct form, easier to read if it's flatter.
                    // fieldArgs.apply(() => $and.andPlan());
                    fieldArgs.apply($and);
                  },
                []
              ),
            }
          ),
          or: fieldWithHooks(
            {
              fieldName: "or",
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: `Checks for any expressions in this list.`,
              type: new GraphQLList(new GraphQLNonNull(Self)),
              applyPlan: EXPORTABLE(
                () =>
                  function ($where: PgConditionStep<any>, fieldArgs) {
                    // TODO Why is the result using AND logic?
                    const $or = $where.orPlan();
                    // Every entry is added to the `$or`, but the entries themselves should use an `and`.
                    fieldArgs.apply(() => $or.andPlan());
                  },
                []
              ),
            }
          ),
          not: fieldWithHooks(
            {
              fieldName: "not",
              isPgConnectionFilterOperatorLogical: true,
            },
            {
              description: `Negates the expression.`,
              type: Self,
              applyPlan: EXPORTABLE(
                () =>
                  function ($where: PgConditionStep<any>, fieldArgs) {
                    const $not = $where.notPlan();
                    const $and = $not.andPlan();
                    fieldArgs.apply($and);
                  },
                []
              ),
            }
          ),
        };

        return extend(fields, logicalOperatorFields, "");
      },
    },
  },
};
