import { argv } from "../src/config/yargs";
import { startServer } from "../src/server";
import dotenv from "dotenv";

dotenv.config();

jest.mock('../src/config/yargs', () => jest.createMockFromModule('../src/config/yargs'));

(argv as jest.Mock).mockImplementation(() => {
    return { argv: { name: 'test', port: 3001 } };
});

describe("subgraph plugin test", () => {
    let server: any = null;
    beforeAll(async () => {
        // TODO creaet database and data
        // await createDatabase();

        server = await startServer();
    });
    afterAll(async () => {
        // TODO drop database

        // stop server
        server?.close();
    });

    it("query _metadata", async () => {
        // query _metadata
    });
    it("filter plugin", async () => {

    });
    it("order plugin", async () => {

    });
    it("block height plugin", async () => {

    });
});
