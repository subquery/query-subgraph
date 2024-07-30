import dotenv from "dotenv";
import util from "util";
import "graphile-config";
import "postgraphile";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { makePgService } from "postgraphile/adaptors/pg";

dotenv.config();

const DEFAULT_PORT = 3000;
const pgConnection = util.format("postgres://%s:%s@%s:%s/%s", process.env.DB_USER, process.env.DB_PASS, process.env.DB_HOT, process.env.DB_PORT, process.env.DB_DATABASE);
const pgSchema: string[] = process.env.PG_SCHEMA ? process.env.PG_SCHEMA.split(",") : ["public"];

const preset: GraphileConfig.Preset = {
  extends: [PostGraphileAmberPreset],
  gather: { pgFakeConstraintsAutofixForeignKeyUniqueness: true },
  grafserv: { port: DEFAULT_PORT },
  pgServices: [makePgService({
    connectionString: pgConnection,
    schemas: pgSchema,
  })],
};

export default preset;

