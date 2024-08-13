// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import { withPgClientTransaction } from "postgraphile/@dataplan/pg";


const METADATA_TYPES = {
    deployments: 'string',
    indexerHealthy: 'boolean',
    lastProcessedHeight: 'number',
};

type MetaData = {
  deployment: String
  hasIndexingErrors: Boolean
  block?:{
    number?: Number,
    hash?: String,
    parentHash?: String,
    timestamp?: Number
  },
}

const METADATA_KEYS = Object.keys(METADATA_TYPES);

type MetaType = number | string | boolean |object;

type MetaEntry = {key: string; value: MetaType};

export function CreateMetadataPlugin(schemaName:string){
    return makeExtendSchemaPlugin((build) => {

        const metadata = build.input.pgRegistry.pgResources._metadata;

        return {
            typeDefs: gql`
                type MetaBlock{
                    number: Int,
                    hash: String,
                    parentHash: String,
                    timestamp: Int
                }
                type MetadataPayload {
                    deployment: String
                    hasIndexingErrors: Boolean,
                    block: MetaBlock
                }
                extend type Query {
                    _meta: MetadataPayload
                }
            `,
            plans: {

                Query: {
                    _meta(){
                        const $executorContext = metadata.executor.context();
                        const $metadataResult = withPgClientTransaction(
                            metadata.executor,
                            $executorContext,
                            async (client, data) => {

                                const {rows} = await client.query({
                                    text: `select * from "${schemaName}"."_metadata" WHERE key = ANY ($1)`,
                                    values: [METADATA_KEYS],
                                });

                                const result= {} as MetaData ;
                                for(const row of rows as MetaEntry[]){
                                    if(row.key === 'deployments'){
                                        if (typeof row.value !== "string") {
                                            throw new Error(`Expected deployments to be a string, but got ${typeof row.value}`);
                                        }
                                        const deployments = JSON.parse(row.value);
                                        const lastDeploymentKey = Math.max(...Object.keys(deployments).map(Number));
                                        result.deployment = deployments[lastDeploymentKey];
                                    }
                                    if(row.key === 'indexerHealthy'){
                                        result.hasIndexingErrors = Boolean(row.value);
                                    }

                                    if(row.key === 'lastProcessedHeight'){
                                        if(result.block === undefined){
                                            result.block = {};
                                        }
                                        result.block.number = Number(row.value);
                                    }
                                }
                                return result
                            },
                        );
                        return $metadataResult;
                    },
                },
            },
        };
    });
}

