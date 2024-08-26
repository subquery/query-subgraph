import type { PgSelectStep, PgCodec } from "@dataplan/pg";
import type { ConnectionStep, FieldArgs } from "grafast";
import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLNamedType,
} from "graphql";

declare global {
  namespace GraphileBuild {
    interface Inflection {
      tableWhereType(this: Inflection, typeName: string): string;
    }
  }
}

export const ArgFilterPlugin: GraphileConfig.Plugin = {
  name: "ArgFilterPlugin",
  version: "0.0.1",

  inflection: {
    add: {
      tableWhereType(options, typeName) {
        return this.upperCamelCase(`${typeName}-where`);
      }
    }
  },

  schema: {
    hooks: {
      init: {
        after: ["PgCodecs"],
        callback(_, build) {
          const { inflection, EXPORTABLE, sql } = build;

          // Create filter type for all column-having codecs
          for (const pgCodec of build.allPgCodecs) {
            if (!pgCodec.attributes) continue;

            // skip metadata tables
            const nodeTypeName = build.getGraphQLTypeNameByPgCodec(pgCodec, "output");
            if (!nodeTypeName) continue;

            const tableWhereTypeName = inflection.tableWhereType(nodeTypeName);

            build.registerInputObjectType(
              tableWhereTypeName,
              {
                pgCodec,
                isPgConnectionFilter: true,
              },
              () => ({
                description: `A filter to be used against \`${nodeTypeName}\` object types. All fields are combined with a logical ‘and.’`,
                // fields,
              }),
              "ArgWhereAttributesPlugin"
            );
          }

          return _;
        },
      },

      // Add `filter` input argument to connection and simple collection types
      GraphQLObjectType_fields_field_args(args, build, context) {
        const {
          extend,
          inflection,
          EXPORTABLE,
        } = build;
        const {
          scope: {
            isPgFieldConnection,
            isPgFieldSimpleCollection,
            pgFieldResource: resource,
            pgFieldCodec,
            fieldName,
          },
          Self,
        } = context;

        const shouldAddFilter =
          isPgFieldConnection || isPgFieldSimpleCollection;
        if (!shouldAddFilter) return args;

        const codec = (pgFieldCodec ?? resource?.codec) as PgCodec;
        if (!codec) return args;

        const returnCodec = codec;
        const nodeType = build.getGraphQLTypeByPgCodec(
          returnCodec,
          "output"
        ) as GraphQLOutputType & GraphQLNamedType;
        if (!nodeType) {
          return args;
        }
        const nodeTypeName = nodeType.name;
        const filterTypeName = inflection.tableWhereType(nodeTypeName);

        const FilterType = build.getTypeByName(filterTypeName) as
          | GraphQLInputType
          | undefined;
        if (!FilterType) {
          return args;
        }

        const attributeCodec =
          resource?.parameters && !resource?.codec.attributes
            ? resource.codec
            : null;

        return extend(
          args,
          {
            where: {
              description:
                "A filter to be used in determining which values should be returned by the collection.",
              type: FilterType,
              autoApplyAfterParentPlan: true,
              ...(isPgFieldConnection
                ? {
                  applyPlan: EXPORTABLE(
                    (attributeCodec) =>
                      function (
                        _: any,
                        $connection: ConnectionStep<
                          any,
                          any,
                          any,
                          PgSelectStep
                        >,
                        fieldArgs: FieldArgs
                      ) {
                        // assertAllowed(fieldArgs, "object");
                        const $pgSelect = $connection.getSubplan();
                        const $where = $pgSelect.wherePlan();
                        if (attributeCodec) {
                          $where.extensions.pgFilterAttribute = {
                            codec: attributeCodec,
                          };
                        }
                        fieldArgs.apply($where);
                      },
                    [attributeCodec]
                  ),
                }
                : {
                  applyPlan: EXPORTABLE(
                    (attributeCodec) =>
                      function (
                        _: any,
                        $pgSelect: PgSelectStep,
                        fieldArgs: any
                      ) {
                        // assertAllowed(fieldArgs, "object");
                        const $where = $pgSelect.wherePlan();
                        if (attributeCodec) {
                          $where.extensions.pgFilterAttribute = {
                            codec: attributeCodec,
                          };
                        }
                        fieldArgs.apply($where);
                      },
                    [attributeCodec]
                  ),
                }),
            },
          },
          `Adding connection filter arg to field '${fieldName}' of '${Self.name}'`
        );
      },
    },
  },
};
