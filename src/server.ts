// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { createServer } from "node:http";
import { grafserv } from "postgraphile/grafserv/node";
import { pgl } from "./pgl.js";
import {argv} from "./config/yargs";
import {DEFAULT_PORT} from "./config/index";

const port = argv('port') ?? DEFAULT_PORT;

export function startServer() {
    const serv = pgl.createServ(grafserv);

    const server = createServer();
    server.on("error", (e) => {
        console.error(e);
    });

    serv.addTo(server).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    server.listen(port);
    console.log(`Server listening on http://localhost:${port}`);
}
