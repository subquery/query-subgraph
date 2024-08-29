// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Declare the type
import type {
    PgCodecWithAttributes,
    PgSelectStep
} from "@dataplan/pg";
import { GraphQLFloat } from "graphql";
import { GraphQLInputObjectType } from "grafast/graphql";
import { makeRangeQuery } from "./utils";

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
    }
}

export const PgBlockHeightPlugin: GraphileConfig.Plugin = {
    name: "PgBlockHeightPlugin",
    description: "Adds the 'blockHeight' argument to connections and lists",

    version: "0.0.1",
    inflection: {
        add: {
            blockHeightType(options, typeName) {
                return this.upperCamelCase(`${typeName}-blockHeight-filter`);
            },
        },
    },

    schema: {
        entityBehavior: {
            pgCodec: "select filter",
            pgResource: {
                provides: ["default"],
                before: ["inferred", "override"],
                callback(behavior, resource) {
                    return [resource.parameters ? "" : "filter", behavior];
                },
            },
        },
        hooks: {
            // https://postgraphile.org/postgraphile/next/migrating-from-v4/migrating-custom-plugins/#example
            // register the new block height type
            init(_, build) {
                const { inflection } = build;
                // @ts-ignore
                for (const rawCodec of build.pgCodecMetaLookup.keys()) {
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
                                    "type",
                                ),
                                fields: {
                                    number: { type: GraphQLFloat },
                                }
                            }),
                            `Adding blockHeight type for ${codec.name}.`,
                        );
                    });
                }
                return _;
            },

            GraphQLObjectType_fields_field_args: (args, build, context) => {
                const { scope, Self } = context;

                const {
                    fieldName,
                    fieldBehaviorScope,
                    isPgFieldConnection,
                    isPgFieldSimpleCollection,
                    pgFieldResource: pgResource,
                    pgFieldCodec,

                } = scope;

                const shouldAddCondition = isPgFieldSimpleCollection;

                const codec = pgFieldCodec ?? pgResource?.codec;

                const isSuitableSource =
                    pgResource && pgResource.codec.attributes && !pgResource.isUnique;
                const isSuitableCodec =
                    codec &&
                    (isSuitableSource ||
                        (!pgResource && codec?.polymorphism?.mode === "union")) &&
                    codec.attributes;

                if (!shouldAddCondition || !isSuitableCodec) {
                    return args;
                }

                // Need to get rid of the control of the filter behavior
                // const desiredBehavior = fieldBehaviorScope
                //     ? `${fieldBehaviorScope}:filter`
                //     : `filter`;
                // if (
                //     pgResource
                //         ? !build.behavior.pgResourceMatches(pgResource, desiredBehavior)
                //         : codec
                //             ? !build.behavior.pgCodecMatches(codec, desiredBehavior)
                //             : true
                // ) {
                //     return args;
                // }


                if (scope.isPgRowByUniqueConstraintField || scope.isPgFieldConnection) {
                    return args;
                }

                const tableTypeName = build.inflection.tableType(codec);
                // Temp implementation to skip metadata tables, wait omit metadata plugin to be implemented
                if (tableTypeName === '_Metadatum' || tableTypeName === '_metadata' || tableTypeName === '_meta') {
                    return args
                }
                const tableBlockHeightTypeName =
                    build.inflection.blockHeightType(tableTypeName);
                //
                const tableBlockHeightType = build.getTypeByName(
                    tableBlockHeightTypeName,
                ) as GraphQLInputObjectType | undefined;

                if (!tableBlockHeightType) {
                    return args;
                }

                return build.extend(args, {
                    block: {
                        description: build.wrapDescription(
                            "A block height to be used in determining which block range values should be returned",
                            "arg",
                        ),
                        // defaultValue: { number : 9223372036854775807},
                        autoApplyAfterParentPlan: true,
                        type: tableBlockHeightType,

                        applyPlan: (_, $pgSelect: PgSelectStep, val) => {
                            _._blockHeightCondition = { val };
                            const height = build.sql.fragment`${build.sql.value(val.getRaw('number').eval())}::bigint`
                            const alias = $pgSelect.alias;

                            const rangeQuery = makeRangeQuery(alias, height, build.sql)
                            $pgSelect.where(rangeQuery);
                        }

                    },
                },
                    `Adding 'blockRange' argument to args`,
                )

            }

        },
    },
};


