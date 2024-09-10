import { pgl, startServer } from "../src/server";
import { Pool } from 'pg';
import dotenv from "dotenv";
import { ApolloServer, gql } from 'apollo-server-express';
import type { GraphQLSchema } from 'graphql';
dotenv.config();

jest.mock('../src/config/yargs', () => {
  const dbSchema = 'subgraph_test';
  const actualModule = jest.requireActual('../src/config/yargs');

  const getYargsOption = jest.fn(() => ({
    argv: {
      name: dbSchema,
      port: 3001,
      'query-explain': true,
      'query-timeout': 3000,
    }
  }));
  const argv = (arg: string) => (getYargsOption().argv as any)[arg];
  return {
    ...actualModule,
    getYargsOption,
    argv,
  };
});

describe("subgraph plugin test", () => {
  const dbSchema = 'subgraph_test';
  let server: any = null;
  let graphqlSchema: GraphQLSchema | undefined = undefined;
  let apolloServer: ApolloServer | null = null;

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
    await pool.query(`INSERT INTO ${dbSchema}._metadata(
            key, value, "createdAt", "updatedAt")
            VALUES ('${key}', '${value}', '2021-11-07 07:02:31.768+00', '2021-11-07 07:02:31.768+00');`);
  }

  beforeAll(async () => {
    await initDatabase().catch(()=>{console.log('init database error')});
    server = await startServer();
    graphqlSchema = await pgl.getSchema();
    apolloServer = new ApolloServer({ schema: graphqlSchema })
  });

  afterAll(async () => {
    // stop server
    server?.close();

    // drop database
    await pool.query(`DROP SCHEMA ${dbSchema} CASCADE;`);
    await pool.end();
  });

  it("query _metadata", async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', '398'),
      insertMetadata('lastProcessedTimestamp', '110101'),
      insertMetadata('targetHeight', '7595931'),
      insertMetadata('chain', `"Polkadot"`),
      insertMetadata('specName', `"polkadot"`),
      insertMetadata('genesisHash', `"0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"`),
      insertMetadata('indexerHealthy', 'true'),
      insertMetadata('indexerNodeVersion', `"0.21-0"`),
    ]);

    const GET_META = gql`
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
    `

    const mock = {
      "_meta": {
        "block": {
          "hash": null,
          "parentHash": null,
          "number": 398,
          "timestamp": null
        },
        "deployment": null,
        "hasIndexingErrors": true
      }
    };

    const results = await apolloServer!.executeOperation({ query: GET_META });
    const fetchedMeta = results.data;

    expect(fetchedMeta).toMatchObject(mock);
  });
  it("filter plugin", async () => {

  });
  it("order plugin", async () => {

  });
  it("block height plugin", async () => {

  });
});
