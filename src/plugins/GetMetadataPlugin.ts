// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { gql, extendSchema } from 'graphile-utils';
import { loadOneWithPgClient } from 'postgraphile/@dataplan/pg';

const METADATA_TYPES = {
  deployments: 'string',
  indexerHealthy: 'boolean',
  lastProcessedHeight: 'number',
};

type MetaData = {
  deployment: string;
  hasIndexingErrors: boolean;
  block?: {
    number?: number;
    hash?: string;
    parentHash?: string;
    timestamp?: number;
  };
};

const METADATA_KEYS = Object.keys(METADATA_TYPES);

type MetaType = number | string | boolean | object;

type MetaEntry = { key: string; value: MetaType };

export function CreateMetadataPlugin(schemaName: string): GraphileConfig.Plugin {
  return extendSchema((build) => {
    // TODO Only handled the single-chain scenario, multi-chains may have unexpected results.
    const metadata = build.input.pgRegistry.pgResources._metadata;

    return {
      typeDefs: gql`
        type MetaBlock {
          number: Int
          hash: String
          parentHash: String
          timestamp: Int
        }
        type MetadataPayload {
          deployment: String
          hasIndexingErrors: Boolean
          block: MetaBlock
        }
        extend type Query {
          _meta: MetadataPayload
        }
      `,
      objects: {
        Query: {
          plans: {
            _meta() {
              const $executorContext = metadata.executor.context();
              return loadOneWithPgClient(metadata.executor, $executorContext, async (client) => {
                const { rows } = await client.query<MetaEntry>({
                  text: `select * from "${schemaName}"."_metadata" WHERE key = ANY ($1)`,
                  values: [METADATA_KEYS],
                });

                const result = {} as MetaData;
                for (const row of rows) {
                  if (row.key === 'deployments') {
                    if (typeof row.value !== 'string') {
                      throw new Error(
                        `Expected deployments to be a string, but got ${typeof row.value}`
                      );
                    }
                    const deployments = JSON.parse(row.value);
                    const lastDeploymentKey = Math.max(...Object.keys(deployments).map(Number));
                    result.deployment = deployments[lastDeploymentKey];
                  }
                  if (row.key === 'indexerHealthy') {
                    result.hasIndexingErrors = Boolean(row.value);
                  }

                  if (row.key === 'lastProcessedHeight') {
                    if (result.block === undefined) {
                      result.block = {};
                    }
                    result.block.number = Number(row.value);
                  }
                }
                return [result];
              });
            },
          },
        },
      },
    };
  });
}
