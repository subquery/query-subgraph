// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import dotenv from "dotenv";
import util from "util";
import "graphile-config";
import "postgraphile";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { makePgService } from "postgraphile/adaptors/pg";
import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import historicalPlugins from "../plugins/historical";
import { CreateMetadataPlugin } from "../plugins/GetMetadataPlugin";
import { CreateSchemaSmartTagsPlugin } from "../plugins/smartTagsPlugin";
import { PgRowByVirtualIdPlugin } from "../plugins/PgRowByVirtualIdPlugin";
import { PgIdToNodeIdPlugin } from "../plugins/PgIdToNodeIdPlugin";
import { argv } from "./yargs";
import { ArgFilterLogicalOperatorsPlugin } from "../plugins/filter/ArgFilterLogicalOperatorsPlugin";
import { ArgFilterPlugin } from "../plugins/filter/ArgFilterPlugin";
import { ArgFilterAttributesPlugin } from "../plugins/filter/ArgFilterAttributesPlugin";
import { OrderByAttributesPlugin } from "../plugins/filter/OrderByAttributesPlugin";
import { OffsetToSkitPlugin } from "../plugins/OffsetToSkitPlugin";
import { ArgFilterBackwardRelationsPlugin } from "../plugins/filter/ArgFilterBackwardRelationsPlugin";

dotenv.config();

export const DEFAULT_PORT = 3000;
const pgConnection = util.format("postgres://%s:%s@%s:%s/%s", process.env.DB_USER, process.env.DB_PASS, process.env.DB_HOT, process.env.DB_PORT, process.env.DB_DATABASE);
const pgSchema: string = argv('name') as string ?? process.env.PG_SCHEMA ?? "public";

const SchemaSmartTagsPlugin = CreateSchemaSmartTagsPlugin(pgSchema)
const metadataPlugin = CreateMetadataPlugin(pgSchema)
export const preset: GraphileConfig.Preset = {
  extends: [PostGraphileAmberPreset, PgSimplifyInflectionPreset],
  grafserv: { port: DEFAULT_PORT },
  pgServices: [makePgService({
    connectionString: pgConnection,
    schemas: pgSchema,
  })],
  grafast: {
    explain: Boolean(argv('query-explain')), //GOOD to have in dev env
    context: {
      pgSettings: {
        statement_timeout: String(argv('query-timeout')),
      }
    }
  },
  schema: {
    defaultBehavior: "-connection +list -insert -update -delete -filter -order",
    pgOmitListSuffix: true
  },
  plugins: [
    SchemaSmartTagsPlugin,
    ...historicalPlugins,
    metadataPlugin,
    PgRowByVirtualIdPlugin,
    PgIdToNodeIdPlugin,
    ArgFilterPlugin,
    ArgFilterAttributesPlugin,
    ArgFilterLogicalOperatorsPlugin,
    OrderByAttributesPlugin,
    OffsetToSkitPlugin,
    ArgFilterBackwardRelationsPlugin
  ],
  disablePlugins: ["PgConditionCustomFieldsPlugin", "PgRowByUniquePlugin"]
};

export default preset;

