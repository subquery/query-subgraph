import type { PgSelectStep, PgCodec } from "@dataplan/pg";
import type { ConnectionStep, FieldArgs } from "grafast";
import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLNamedType,
  ThunkObjMap,
  GraphQLEnumValueConfig
} from "graphql";

const OrderDirectionFieldName = 'OrderDirection'

export const OrderByAttributesPlugin: GraphileConfig.Plugin = {
  name: "OrderByAttributesPlugin",
  version: "1.0.0",

  inflection: {
    add: {
      tableOrderByType(options, typeName) {
        return this.upperCamelCase(`${typeName}-order-by`);
      }
    }
  },

  schema: {
    hooks: {
      init: {
        after: ["PgCodecs"],
        callback(_, build) {
          const { inflection, EXPORTABLE, sql } = build;

          for (const pgCodec of build.allPgCodecs) {
            if (!pgCodec.attributes) continue;

            // skip metadata tables
            const nodeTypeName = build.getGraphQLTypeNameByPgCodec(pgCodec, "output");
            if (!nodeTypeName) continue;

            const orderValues: ThunkObjMap<GraphQLEnumValueConfig> = {}
            const tableOrderByTypeName = inflection.tableOrderByType(nodeTypeName);

            for (const field of Object.keys(pgCodec.attributes)) {
              if (field.startsWith('_')) continue;

              orderValues[field] = { value: field }
            }

            build.registerEnumType(
              tableOrderByTypeName,
              {},
              () => ({
                name: tableOrderByTypeName,
                values: orderValues,
                description: `order by Enum types.`,
                // applyPlan: EXPORTABLE(() => (a, b, c) => {

                // }, [])
              }),
              "OrderByAttributesPlugin"
            );

          }

          build.registerEnumType(
            OrderDirectionFieldName,
            {},
            () => ({
              name: OrderDirectionFieldName,
              values: {
                asc: { value: 'asc' },
                desc: { value: 'desc' },
              },
              description: `order by direction Enum types.`,
              // applyPlan: EXPORTABLE(() => (a, b, c) => {

              // }, [])
            }),
            "OrderByAttributesPlugin"
          );

          return _;
        },
      },

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
        const orderByTypeName = inflection.tableOrderByType(nodeTypeName);

        const OrderByType = build.getTypeByName(orderByTypeName) as
          | GraphQLInputType
          | undefined;
        if (!OrderByType) {
          return args;
        }

        const attributeCodec =
          resource?.parameters && !resource?.codec.attributes
            ? resource.codec
            : null;

        return extend(
          args,
          {
            orderBy: {
              description: "order by attributes to be used against object types.",
              type: OrderByType,
              autoApplyAfterParentPlan: true,
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
                    const $pgSelect = $connection.getSubplan();
                    $pgSelect.extensions.pgOrderByAttribute = {
                      codec: attributeCodec,
                    };
                    fieldArgs.apply($pgSelect);
                  },
                [attributeCodec]
              ),
            },
            orderDirection: {
              description: "Specifies the direction in which to order the results.",
              type: build.getTypeByName(OrderDirectionFieldName),
              autoApplyAfterParentPlan: true,
              // applyPlan: EXPORTABLE(() => function (a, ba, ca) {
              //   return a
              // }, [])
            },
          },
          `Adding orderBy argument to ${orderByTypeName}`
        );
      },
    },
  }
};
