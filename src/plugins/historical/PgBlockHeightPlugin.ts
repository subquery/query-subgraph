// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Declare the type
import type {
    PgCodecWithAttributes,
    PgSelectStep
} from "@dataplan/pg";
import { GraphQLFloat,GraphQLInputObjectType } from "graphql";
import {SQL} from "pg-sql2";
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

// TODO, Temporarily store the block height condition from root args
// Revisit this issue once we have a better understanding.
let _globalHeight:SQL;

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

            // Apply block_range to connection/fields
            GraphQLObjectType_fields_field: {
                callback: (field, build, context) => {
                    const { extend } = build;
                    const {
                        scope: { isPgManyRelationListField,isPgSingleRelationField,isRootQuery },
                    } = context;

                    if (! (isPgSingleRelationField ||isPgManyRelationListField)) {
                        return field;
                    }
                    if(!isRootQuery){
                        if (!field.args){
                            field.args = {}
                        }
                        field.args = extend(field.args, {
                                connection_block: {
                                    description: build.wrapDescription(
                                        "Hierarchy block height to be used in determining which block range values should be returned",
                                        "arg",
                                    ),
                                    type: GraphQLFloat,
                                    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                                    defaultValue: 9223372036854775807,
                                    autoApplyAfterParentPlan: true,
                                    applyPlan: (_, $pgSelect: PgSelectStep, val) => {
                                        const height = _globalHeight;
                                        const alias = $pgSelect.alias;

                                        const rangeQuery = makeRangeQuery(alias, height, build.sql)
                                        $pgSelect.where(rangeQuery);
                                    }

                                },
                            },
                            `Adding 'blockRange' field`,
                        )
                    }

                    return field
                },
                provides: ["ClientMutationIdDescription"],
            },


            // Apply block_range to top level entity
            GraphQLObjectType_fields_field_args: (args, build, context) => {
                const { Self, scope } = context;

                const {
                    isPgFieldSimpleCollection,
                    isRootQuery,
                    pgFieldCodec,
                    pgFieldResource: pgResource

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

                if (!shouldAddCondition || !isSuitableCodec ||!isRootQuery) {
                    return args;
                }

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
                        autoApplyAfterParentPlan: true,
                        type: tableBlockHeightType,

                        applyPlan: (_, $pgSelect: PgSelectStep, val) => {
                            _._blockHeightCondition = { val };
                            const height = build.sql.fragment`${build.sql.value(val.getRaw('number').eval())}::bigint`
                            _globalHeight = height;
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


