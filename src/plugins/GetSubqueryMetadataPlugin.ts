// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { URL } from 'url';
import {
  getMetadataTableName,
  MetaData,
  METADATA_REGEX,
  MULTI_METADATA_REGEX,
  TableEstimate,
} from '@subql/utils';
import { makeExtendSchemaPlugin, gql, ExtensionDefinition } from 'graphile-utils';
import fetch, { Response } from 'node-fetch';
import { PgClient, withPgClientTransaction } from 'postgraphile/@dataplan/pg';
import { constant } from 'postgraphile/grafast';
import { ArgsInterface } from '../config/yargs';

const extensionsTypeDefs: ExtensionDefinition['typeDefs'] = gql`
  type TableEstimate {
    table: String
    estimate: Int
  }
  type _Metadata {
    lastProcessedHeight: Int
    lastProcessedTimestamp: Date
    targetHeight: Int
    chain: String
    specName: String
    genesisHash: String
    startHeight: Int
    indexerHealthy: Boolean
    indexerNodeVersion: String
    queryNodeVersion: String
    queryNodeStyle: String
    rowCountEstimate: [TableEstimate]
    dynamicDatasources: [JSON]
    evmChainId: String
    deployments: JSON
    lastFinalizedVerifiedHeight: Int
    unfinalizedBlocks: String
    lastCreatedPoiHeight: Int
    latestSyncedPoiHeight: Int
    dbSize: BigInt
  }
  type _Metadatas {
    totalCount: Int!
    nodes: [_Metadata]!
  }
  extend type Query {
    _metadata(chainId: String): _Metadata
    _metadatas(after: Cursor, before: Cursor): _Metadatas
  }
`;
type MetaType = number | string | boolean;
type MetaEntry = { key: string; value: MetaType };
type MetadatasConnection = {
  totalCount?: number;
  nodes?: MetaData[];
};

const { version: packageVersion } = require('../../package.json');
const META_JSON_FIELDS = ['deployments'];

// TODO Is it necessary to update the SDK util package?
const metaCache = {
  queryNodeVersion: packageVersion,
  queryNodeStyle: 'subgraph',
} as MetaData & { queryNodeStyle: 'subgraph' };

async function fetchFromApi(argv: ArgsInterface): Promise<void> {
  let health: Response;
  let meta: Response;

  const indexerUrl = argv.indexer;

  try {
    meta = await fetch(new URL(`meta`, indexerUrl));
    const result = await meta.json();
    Object.assign(metaCache, result);
  } catch (e: any) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer meta, `, e.message);
  }

  try {
    health = await fetch(new URL(`health`, indexerUrl));
    metaCache.indexerHealthy = !!health.ok;
  } catch (e: any) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer health, `, e.message);
  }
}

function matchMetadataTableName(name: string): boolean {
  return METADATA_REGEX.test(name) || MULTI_METADATA_REGEX.test(name);
}

async function getTableEstimate(schemaName: string, pgClient: PgClient) {
  const { rows } = await pgClient.query<TableEstimate>({
    text: `select relname as table , reltuples::bigint as estimate from pg_class
        where 
          relnamespace in (select oid from pg_namespace where nspname = $1)
        and 
          relname in (select table_name from information_schema.tables where table_schema = $1)`,
    values: [schemaName],
  });
  return rows;
}

export function CreateSubqueryMetadataPlugin(schemaName: string, args: ArgsInterface) {
  return makeExtendSchemaPlugin((build) => {
    // Find all metadata table
    const pgResources = build.input.pgRegistry.pgResources;
    const metadataTables = Object.keys(build.input.pgRegistry.pgResources).filter((tableName) =>
      matchMetadataTableName(tableName)
    );
    const metadataPgResource = metadataTables.reduce(
      (result, key) => {
        result[key] = pgResources[key];
        return result;
      },
      {} as { [key: string]: (typeof pgResources)[keyof typeof pgResources] }
    );

    // TODO Is this feature necessary?
    // if (args.indexer) {
    //   setAsyncInterval(async () => await fetchFromApi(args), 10000);
    // }

    return {
      typeDefs: extensionsTypeDefs,

      plans: {
        Query: {
          _metadata($parent, { $chainId }, ...args) {
            const totalCountInput = $parent.get('totalCount');
            if ($chainId === undefined) {
              return;
            }

            const chainId = $chainId.eval();
            const metadataTableName = chainId ? getMetadataTableName(chainId) : '_metadata';
            const $metadata = metadataPgResource[metadataTableName];
            if (!$metadata) throw new Error(`Not Found Metadata, chainId: ${chainId}`);
            const $metadataResult = withPgClientTransaction(
              $metadata.executor,
              $chainId,
              async (pgClient, input) => {
                const { rows } = await pgClient.query({
                  text: `select value, key from "${schemaName}"."${metadataTableName}"`,
                });
                const result: any = {};
                rows.forEach((item: any) => {
                  if (META_JSON_FIELDS.includes(item.key)) {
                    result[item.key] = JSON.parse(item.value);
                  } else {
                    result[item.key] = item.value;
                  }
                });

                // TODO How to check if the field should be returned.
                result.rowCountEstimate = await getTableEstimate(schemaName, pgClient);
                result.queryNodeVersion = packageVersion;
                result.queryNodeStyle = 'subgraph';
                return result;
              }
            );

            return $metadataResult;
          },
          _metadatas(_, $input) {
            const totalCount = Object.keys(metadataPgResource).length;
            const pgTable = metadataPgResource[metadataTables[0]];
            if (!totalCount || !pgTable) {
              return constant({ totalCount: 0, nodes: [] });
            }

            const $metadataResult = withPgClientTransaction(
              pgTable.executor,
              $input.getRaw(''),
              async (pgClient, input): Promise<MetadatasConnection> => {
                const nodes = await Promise.all(
                  metadataTables.map(async (tableName) => {
                    const { rows } = await pgClient.query({
                      text: `select value, key from "${schemaName}"."${tableName}"`,
                    });
                    const result: any = {};
                    rows.forEach((item: any) => {
                      if (META_JSON_FIELDS.includes(item.key)) {
                        result[item.key] = JSON.parse(item.value);
                      } else {
                        result[item.key] = item.value;
                      }
                    });

                    // TODO How to check if the field should be returned.
                    result.rowCountEstimate = await getTableEstimate(schemaName, pgClient);
                    result.queryNodeVersion = packageVersion;
                    result.queryNodeStyle = 'subgraph';
                    return result;
                  })
                );

                return { totalCount, nodes };
              }
            );

            return $metadataResult;
          },
        },
      },
    };
  });
}
