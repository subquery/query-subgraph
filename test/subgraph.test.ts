import { startServer } from "../src/server";
import { Pool } from 'pg';
import dotenv from "dotenv";
import { ApolloClient, DocumentNode, InMemoryCache, gql } from '@apollo/client';
import { ArgsInterface } from "../src/config";
dotenv.config();

describe("subgraph plugin test", () => {
  const dbSchema = 'subgraph_test';
  let server: any = null;
  let apolloClient: ApolloClient<any> | undefined;

  const pool: Pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT as string),
    database: process.env.DB_DATABASE,
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL client generated error: ', err.message);
  });

  async function graphqlQuery(query: DocumentNode) {
    return await apolloClient!.query({ query });
  }

  async function initDatabase() {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
    // creaet database and data
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);

    // _metadata table
    await pool.query(`CREATE TABLE "${dbSchema}"."_metadata" (
      "key" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
      "value" jsonb,
      "createdAt" timestamptz(6) NOT NULL,
      "updatedAt" timestamptz(6) NOT NULL
    );`);
    await pool.query(`ALTER TABLE "${dbSchema}"."_metadata" OWNER TO "postgres";`);

    // account table
    await pool.query(`CREATE TABLE "${dbSchema}"."accounts" (
      "id" text COLLATE "pg_catalog"."default" NOT NULL,
      "public_key" text COLLATE "pg_catalog"."default" NOT NULL,
      "first_transfer_block" int4,
      "last_transfer_block" int4,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT "accounts_pkey" PRIMARY KEY ("_id")
    );`);
    await pool.query(`ALTER TABLE "${dbSchema}"."accounts" OWNER TO "postgres"; `);
    await pool.query(`CREATE INDEX "0x4cb388e53e3e30f3" ON "${dbSchema}"."accounts" USING btree (
      "id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
    );`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."accounts"."id" IS 'id field is always required and must look like this';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."accounts"."public_key" IS 'The public key of this account (same across all Polkadot parachains)';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."accounts"."first_transfer_block" IS 'The first block on which we see a transfer involving this account';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."accounts"."last_transfer_block" IS 'The most recent block on which we see a transfer involving this account';`);

    // transfers table
    await pool.query(`CREATE TABLE "${dbSchema}"."transfers" (
      "id" text COLLATE "pg_catalog"."default" NOT NULL,
      "amount" numeric NOT NULL,
      "block_number" int4 NOT NULL,
      "date" timestamp(6),
      "from_id" text COLLATE "pg_catalog"."default" NOT NULL,
      "to_id" text COLLATE "pg_catalog"."default" NOT NULL,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT "transfers_pkey" PRIMARY KEY ("_id")
    );`);
    await pool.query(`ALTER TABLE "${dbSchema}"."transfers" 
      OWNER TO "postgres";`);
    await pool.query(`CREATE INDEX "0x13d4ea44d92f9384" ON "${dbSchema}"."transfers" USING gist (
      "to_id" COLLATE "pg_catalog"."default" "public"."gist_text_ops",
      "_block_range" "pg_catalog"."range_ops"
    );`);
    await pool.query(`CREATE INDEX "0xb91efc8ed4021e6e" ON "${dbSchema}"."transfers" USING btree (
      "id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
    );`);
    await pool.query(`CREATE INDEX "0xf48017d5c5d3d768" ON "${dbSchema}"."transfers" USING gist (
      "from_id" COLLATE "pg_catalog"."default" "public"."gist_text_ops",
      "_block_range" "pg_catalog"."range_ops"
    );`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."id" IS 'id field is always required and must look like this';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."amount" IS 'Amount that is transferred';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."block_number" IS 'The block height of the transfer';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."date" IS 'The date of the transfer';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."from_id" IS 'The account that transfers are made from';`);
    await pool.query(`COMMENT ON COLUMN "${dbSchema}"."transfers"."to_id" IS 'The account that transfers are made to';`);
    await pool.query(`COMMENT ON TABLE "${dbSchema}"."transfers" IS '@foreignKey (from_id) REFERENCES accounts (id)|@foreignFieldName sentTransfers
    @foreignKey (to_id) REFERENCES accounts (id)|@foreignFieldName recievedTransfers';`);

    console.log('Database initialized');
  }
  async function insertMetadata(key: string, value: string) {
    await pool.query(`INSERT INTO ${dbSchema}._metadata(key, value, "createdAt", "updatedAt") VALUES ('${key}', '${value}', '2021-11-07 07:02:31.768+00', '2021-11-07 07:02:31.768+00');`);
  }
  async function genAccountData() {
    Promise.all([
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1mndd9e8ksscxxdaccbkw3iwfqwdabifre8fvrks5ses4e4', '34,40,104,41,232,173,135,247,11,55,240,40,14,249,28,221,232,183,9,102,182,110,17,124,98,253,135,223,179,110,63,62', 29258, 29258, 'bd5e4b2e-4254-43d6-b400-b9ea8679a1da', '[29258,)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1kvkrevmuitc2lw2a4qyhsajj9ee9lrsywzkmk5hybeyhgw', '14,109,230,139,19,184,36,121,251,233,136,171,158,203,22,186,212,70,182,123,153,60,221,145,152,205,65,199,198,37,156,73', 29258, 29258, '402cee3c-c886-41db-a171-fa95f49f502c', '[29258,197681)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('14tkt6bunjkjdfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs', '152,200,163,208,29,169,135,123,123,48,135,124,113,122,232,242,167,231,38,206,250,23,108,93,252,220,235,201,182,161,34,35', 197681, 197681, 'd093c76f-270a-4d9f-8cd5-153c04e8f024', '[197681,198072)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1kvkrevmuitc2lw2a4qyhsajj9ee9lrsywzkmk5hybeyhgw', '14,109,230,139,19,184,36,121,251,233,136,171,158,203,22,186,212,70,182,123,153,60,221,145,152,205,65,199,198,37,156,73', 29258, 197681, 'e4ce78e1-e1a9-4f4a-91e1-cc47ef3413fc', '[197681,240853)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('14tkt6bunjkjdfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs', '152,200,163,208,29,169,135,123,123,48,135,124,113,122,232,242,167,231,38,206,250,23,108,93,252,220,235,201,182,161,34,35', 197681, 214576, '0e756b37-6377-4f28-930e-42bcc528a3a7', '[214576,241591)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1kvkrevmuitc2lw2a4qyhsajj9ee9lrsywzkmk5hybeyhgw', '14,109,230,139,19,184,36,121,251,233,136,171,158,203,22,186,212,70,182,123,153,60,221,145,152,205,65,199,198,37,156,73', 29258, 240853, '70a3aa2c-f3fa-4f90-9362-6623c81f1324', '[240853,240984)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('14jeznxa4fqzsf7ef9pryrny71cd1ff3czizfrntwvivuc9m', '146,43,193,108,255,26,207,196,160,140,181,191,206,186,218,169,235,24,44,212,122,81,184,176,71,160,32,42,233,98,74,28', 240853, 240853, '165df76f-d500-4d9b-8cb5-aef621186370', '[240853,)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('12j3cz8qskcgjxmsjpvl2z2t3fpmw3kobabargpnuibfc7o8', '76,75,247,249,61,10,94,216,1,239,119,143,142,126,245,130,1,189,215,227,62,22,127,175,66,160,29,67,146,131,203,67', 240853, 240853, '94145ac5-f5d5-49db-94d4-621a25aa146d', '[240853,)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1reg2tyv9rgfrqkppremrhrxrnsudbqkzkywp1ustd97wpj', '18,204,181,51,56,172,13,165,113,211,105,117,72,52,111,181,240,182,55,172,148,18,248,171,191,109,19,88,139,231,86,50', 240984, 240984, '011298ee-b240-4aa3-bb06-1ee46bb8eb23', '[240984,)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('1c6e7tl9hqktqfpdzfjmdlkfiijmqriwosxozzleakcpmpk', '8,117,74,187,106,251,165,26,47,116,240,185,123,188,219,56,63,87,154,2,165,228,84,31,238,115,103,16,175,86,44,108', 240984, 240984, '9058214c-cc2e-441b-bd76-6d24446fe608', '[240984,)');`),
      await pool.query(`INSERT INTO "${dbSchema}"."accounts" ("id", "public_key", "first_transfer_block", "last_transfer_block", "_id", "_block_range") VALUES ('13ypnbtwklbujag2raa286ukrfvvgj3jdxsfihelf5aq1kvk', '112,189,233,173,82,193,14,226,75,136,20,76,97,47,14,86,208,211,183,153,91,217,224,84,17,112,224,111,46,127,199,8', 240984, 240984, '570ee5d8-2071-4fe3-9166-3a7ee3bd30d5', '[240984,)');`),
    ]);
  }

  beforeAll(async () => {
    await initDatabase();
    await genAccountData();
    server = await startServer({
      name: dbSchema,
      port: 3001,
      queryExplain: true,
      queryTimeout: '3000',
    } as ArgsInterface);

    apolloClient = new ApolloClient({ uri: 'http://localhost:3001/graphql', cache: new InMemoryCache({ addTypename: false }) });
  });

  afterAll(async () => {
    // stop server
    server?.close();

    // drop database
    await pool.query(`DROP SCHEMA ${dbSchema} CASCADE;`);
    await pool.end();
  });

  describe("_meta plugin", () => {
    it("query _meta", async () => {
      await Promise.all([
        insertMetadata('genesisHash', '"0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"'),
        insertMetadata('chain', '"Polkadot"'),
        insertMetadata('specName', '"polkadot"'),
        insertMetadata('indexerNodeVersion', '"5.2.2"'),
        insertMetadata('startHeight', '1'),
        insertMetadata('dynamicDatasources', '[]'),
        insertMetadata('deployments', '"{\\"1\\":\\"/polkadot-test\\"}"'),
        insertMetadata('historicalStateEnabled', 'true'),
        insertMetadata('runnerNode', '"@subql/node"'),
        insertMetadata('runnerNodeVersion', '">=3.0.1"'),
        insertMetadata('runnerQuery', '"@subql/query"'),
        insertMetadata('runnerQueryVersion', '"*"'),
        insertMetadata('schemaMigrationCount', '2'),
        insertMetadata('indexerHealthy', 'true'),
        insertMetadata('processedBlockCount', '702'),
        insertMetadata('lastProcessedHeight', '1205725'),
        insertMetadata('lastProcessedTimestamp', '1725960100839'),
        insertMetadata('targetHeight', '22472571'),
      ]);

      const mock = {
        "_meta": {
          "deployment": "/polkadot-test",
          "hasIndexingErrors": true,
          "block": {
            "hash": null,
            "number": 1205725,
            "parentHash": null,
            "timestamp": null
          }
        }
      };

      const results = await graphqlQuery(gql`
      query MyQuery {
        _meta {
          block {
            hash
            parentHash
            number
            timestamp
          }
          deployment
          hasIndexingErrors
        }
      }
    `);
      const fetchedMeta = results.data;

      expect(fetchedMeta).toMatchObject(mock);
    });
  });

  describe("filter plugin", () => {
    it("Equal", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 10, where: {id: "14tkt6bunjkjdfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
    it("Not equal", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 10, where: {id_not: "14tkt6bunjkjdfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });

    it("gte", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_gte: 29258}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(11);
    });

    it("gt", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_gt: 29258}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(7);
    });
    it("lte", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_lte: 29258}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(4);
    });

    it("lt", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_lt: 29258}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(0);
    });
    it("in", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_in: [29258,197681]}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(6);
    });
    it("not_in", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {firstTransferBlock_not_in: [29258,197681]}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(5);
    });
    it("Contains", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_contains: "njkjdfyqvdnfbqzdawmj7waqwfumxmizjhhr"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
    it("Not contains", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_contains: "njkjdfyqvdnfbqzdawmj7waqwfumxmizjhhr"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });

    it("Contains nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_contains_nocase: "njkjdfyqvdnfbqzdawmj7waqwfumxmizJHHr"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
    it("Not contains nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_contains_nocase: "njkjdfyqvdnfbqzdawmj7waqwfumxmizJHHr"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });

    it("ends_with", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_ends_with: "dfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
    it("not_ends_with", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_ends_with: "dfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });
    it("starts_with", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_starts_with: "14tkt6bunjkjdfyqvdnfbq"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
    it("not_starts_with", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_starts_with: "14tkt6bunjkjdfyqvdnfbq"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });
    it("ends_with_nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_ends_with_nocase: "dfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);

      const results2 = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_ends_with_nocase: "dfyqvdnfbqzdawmj7waqwfumxmizjhhrr1g"}) {
            id
          }
        }
      `);
      const fetchedMeta2 = results2.data;
      expect(fetchedMeta2.accounts.length).toBe(0);
    });
    it("not_ends_with_nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_ends_with_nocase: "dfyqvdnfbqzdawmj7waqwfumxmizjhhrr1gs"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });
    it("starts_with_nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_starts_with_nocase: "14tkt6bunjkjdfyqvdnfBQ"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);

      const results2 = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_starts_with_nocase: "tkt6bunjkjdfyqvdnfBQ"}) {
            id
          }
        }
      `);
      const fetchedMeta2 = results2.data;
      expect(fetchedMeta2.accounts.length).toBe(0);
    });
    it("not_starts_with_nocase", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, where: {id_not_starts_with_nocase: "14tkt6bunjkjdfyqvdnfBQ"}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(9);
    });

  });

  describe("order plugin", () => {
    it("order by firstTransferBlock asc", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, orderBy: firstTransferBlock, orderDirection: asc) {
            id
            firstTransferBlock
          }
        }
      `);
      const fetchedMeta = results.data;

      for (let i = 0; i < fetchedMeta.accounts.length - 1; i++) {
        expect(fetchedMeta.accounts[i].firstTransferBlock).toBeLessThanOrEqual(fetchedMeta.accounts[i + 1].firstTransferBlock);
      }
    });

    it("order by firstTransferBlock desc", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          accounts(first: 100, orderBy: firstTransferBlock, orderDirection: desc) {
            id
            firstTransferBlock
          }
        }
      `);
      const fetchedMeta = results.data;

      for (let i = 0; i < fetchedMeta.accounts.length - 1; i++) {
        expect(fetchedMeta.accounts[i].firstTransferBlock).toBeGreaterThanOrEqual(fetchedMeta.accounts[i + 1].firstTransferBlock);
      }
    });

  });

  describe("block height plugin", () => {
    it("block height", async () => {
      const results = await graphqlQuery(gql`
      query MyQuery {
          accounts(block: {number: 30000}) {
            id
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta.accounts.length).toBe(2);
    });
  });

  describe("subqery _metadata query", () => {
    it("block height", async () => {
      const results = await graphqlQuery(gql`
        query MyQuery {
          _metadata {
            lastProcessedHeight
            lastProcessedTimestamp
            targetHeight
            chain
            specName
            genesisHash
            startHeight
            indexerHealthy
            indexerNodeVersion
            queryNodeVersion
            evmChainId
            deployments
            lastFinalizedVerifiedHeight
            unfinalizedBlocks
            lastCreatedPoiHeight
            latestSyncedPoiHeight
            dbSize
            queryNodeStyle
            dynamicDatasources
            rowCountEstimate {
              estimate
              table
            }
          }
        }
      `);
      const fetchedMeta = results.data;
      expect(fetchedMeta).toEqual({
        _metadata: {
          "chain": "Polkadot",
          "dbSize": null,
          "deployments": {
            "1": "/polkadot-test",
          },
          "dynamicDatasources": [],
          "evmChainId": null,
          "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
          "indexerHealthy": true,
          "indexerNodeVersion": "5.2.2",
          "lastCreatedPoiHeight": null,
          "lastFinalizedVerifiedHeight": null,
          "lastProcessedHeight": 1205725,
          "lastProcessedTimestamp": "1725960100839",
          "latestSyncedPoiHeight": null,
          "queryNodeStyle": "subgraph",
          "queryNodeVersion": "0.1.0",
          "specName": "polkadot",
          "startHeight": 1,
          "targetHeight": 22472571,
          "unfinalizedBlocks": null,
          "rowCountEstimate": [
            {
              "estimate": -1,
              "table": "transfers",
            },
            {
              "estimate": -1,
              "table": "accounts",
            },
            {
              "estimate": -1,
              "table": "_metadata",
            },
          ],
        }
      });
    });

  })
});
