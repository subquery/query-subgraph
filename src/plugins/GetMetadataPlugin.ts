// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {MetaData} from '@subql/utils';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';


const {version: packageVersion} = require('../../package.json');
const META_JSON_FIELDS = ['deployments'];
const METADATA_TYPES = {
  lastProcessedHeight: 'number',
  lastProcessedTimestamp: 'number',
  targetHeight: 'number',
  lastFinalizedVerifiedHeight: 'number',
  unfinalizedBlocks: 'string',
  chain: 'string',
  specName: 'string',
  genesisHash: 'string',
  indexerHealthy: 'boolean',
  indexerNodeVersion: 'string',
  queryNodeVersion: 'string',
  dynamicDatasources: 'object',
  startHeight: 'number',
  evmChainId: 'string',
  deployments: 'string',
  lastCreatedPoiHeight: 'number',
  latestSyncedPoiHeight: 'number',
  dbSize: 'string',
};

const METADATA_KEYS = Object.keys(METADATA_TYPES);

type MetaType = number | string | boolean;

type MetaEntry = {key: string; value: MetaType};

type MetadatasConnection = {
  totalCount?: number;
  nodes?: MetaData[];
  // edges?: any; // TODO
};

const metaCache = {
  queryNodeVersion: packageVersion,
} as MetaData;


// function matchMetadataTableName(name: string): boolean {
//   return METADATA_REGEX.test(name) || MULTI_METADATA_REGEX.test(name);
// }
//
// async function fetchMetadataFromTable(
//   pgClient: Client,
//   schemaName: string,
//   tableName: string,
//   useRowEst: boolean
// ): Promise<MetaData> {
//   const {rows} = await pgClient.query(`select * from "${schemaName}".${tableName} WHERE key = ANY ($1)`, [
//     METADATA_KEYS,
//   ]);
//
//   const dbKeyValue = rows.reduce((array: MetaEntry[], curr: MetaEntry) => {
//     array[curr.key] = curr.value;
//     return array;
//   }, {}) as {[key: string]: MetaType};
//
//   const metadata = {} as MetaData;
//
//   for (const key in METADATA_TYPES) {
//     if (typeof dbKeyValue[key] === METADATA_TYPES[key]) {
//       //JSON object are stored in string type, filter here and parse
//       if (META_JSON_FIELDS.includes(key)) {
//         metadata[key] = JSON.parse(dbKeyValue[key].toString());
//       } else {
//         metadata[key] = dbKeyValue[key];
//       }
//     }
//   }
//   metadata.queryNodeVersion = packageVersion;
//
//   if (useRowEst) {
//     const tableEstimates = await pgClient
//       .query<TableEstimate>(
//         `select relname as table , reltuples::bigint as estimate from pg_class
//       where relnamespace in
//             (select oid from pg_namespace where nspname = $1)
//       and relname in
//           (select table_name from information_schema.tables
//            where table_schema = $1)`,
//         [schemaName]
//       )
//       .catch((e) => {
//         throw new Error(`Unable to estimate table row count: ${e}`);
//       });
//     metadata.rowCountEstimate = tableEstimates.rows;
//   }
//
//   return metadata;
// }
//
// // Store default metadata name in table avoid query system table
// let defaultMetadataName: string;
//
// async function fetchFromTable(
//   pgClient: Client,
//   schemaName: string,
//   chainId: string | undefined,
//   useRowEst: boolean
// ): Promise<MetaData> {
//   let metadataTableName: string;
//
//   if (!chainId) {
//     // return first metadata entry you find.
//     if (defaultMetadataName === undefined) {
//       const {rows} = await pgClient.query(
//         `SELECT table_name FROM information_schema.tables where table_schema='${schemaName}'`
//       );
//       const {table_name} = rows.find((obj: {table_name: string}) => matchMetadataTableName(obj.table_name));
//       defaultMetadataName = table_name;
//     }
//     metadataTableName = defaultMetadataName;
//   } else {
//     metadataTableName = getMetadataTableName(chainId);
//   }
//
//   return fetchMetadataFromTable(pgClient, schemaName, metadataTableName, useRowEst);
// }

// function metadataTableSearch(build: Build): boolean {
//   return !!(build.pgIntrospectionResultsByKind).attribute.find((attr) =>
//     matchMetadataTableName(attr.class.name)
//   );
// }

// function isFieldNode(node: SelectionNode): node is FieldNode {
//   return node.kind === 'Field';
// }
//
// /* Recursively work down the AST to find a node with a matching path */
// function findNodePath(nodes: readonly SelectionNode[], path: string[]): FieldNode | undefined {
//   if (!path.length) {
//     throw new Error('Path must have a length');
//   }
//
//   const currentPath = path[0];
//   const found = nodes.find((node) => isFieldNode(node) && node.name.value === currentPath);
//
//   if (found && isFieldNode(found)) {
//     const newPath = path.slice(1);
//
//     if (!newPath.length) return found;
//
//     if (!found.selectionSet) return;
//     return findNodePath(found.selectionSet.selections, newPath);
//   }
// }

export const GetMetaPlugin = makeExtendSchemaPlugin((build) => {
  // const [schemaName] = options.pgSchemas;
  const { sql, inflection } = build;
  return {
    typeDefs: gql`
      type TableEstimate {
        table: String
        estimate: Int
      }

      type _Metadata {
        deployments: JSON
#        lastProcessedHeight: Int
#        lastProcessedTimestamp: Date
#        targetHeight: Int
#        chain: String
#        specName: String
#        genesisHash: String
#        startHeight: Int
#        indexerHealthy: Boolean
#        indexerNodeVersion: String
#        queryNodeVersion: String
#        rowCountEstimate: [TableEstimate]
#        evmChainId: String
#        lastFinalizedVerifiedHeight: Int
#        unfinalizedBlocks: String
#        lastCreatedPoiHeight: Int
#        latestSyncedPoiHeight: Int
      }
      

      extend type Query {
        _meta: _Metadata
      }
    `,
    plans: {
      Query: {
        // _metadata: async (_parentObject, args, context, info): Promise<MetaData | undefined> => {
        //   const tableExists = metadataTableSearch(build);
        //   if (tableExists) {
        //     let rowCountFound = false;
        //     if (info.fieldName === '_metadata') {
        //       rowCountFound = !!findNodePath(info.fieldNodes, ['_metadata', 'rowCountEstimate']);
        //     }
        //     const metadata = await fetchFromTable(context.pgClient, schemaName, args.chainId, rowCountFound);
        //     if (Object.keys(metadata).length > 0) {
        //       return metadata;
        //     }
        //   }
        //   return;
        // },
      },
    },
  };
});

// TODO, Smart tag not work with omit, should use
// https://postgraphile.org/postgraphile/next/migrating-from-v4/migrating-custom-plugins/#globalbehavior-and-entitybehavior
// https://github.com/graphile/crystal/issues/2029
// Asked:
// https://github.com/graphile/crystal/issues/2147

const RemoveMetadataPlugin: GraphileConfig.Plugin= {

  name: "RemoveMetadataPlugin",
  version: "0.0.0",
  after: ["PgAllRowsPlugin","PgRowByUniquePlugin"],
  schema: {
    // Register default behaviors (optional)
    entityBehavior: {
      // Apply 'myCodecBehavior' by default to _all_ codecs
      pgCodec: "removeMetadataBehavior",


      // Apply 'removeMetadataBehavior' to resources with truthy `isUnique` (overrides defaults)
      pgResource(behavior, resource) {
        if (resource.isUnique) {
          return [behavior, "myResourceBehavior"];
        } else {
          return behavior;
        }
      },
    },

    // Do something with behaviors (optional)
    hooks: {
      GraphQLObjectType_fields(field, build, context) {
        const codec = context.scope.pgCodec;

        const {
          graphql: { GraphQLNonNull, GraphQLObjectType },
        } = build;

        if (
            !codec ||
            !build.behavior.pgCodecMatches(codec, "removeMetadataBehavior")
        ) {
          return field;
        }

        // Behavior matches! Do stuff here...

        return field;
      },
    },
  },
};
