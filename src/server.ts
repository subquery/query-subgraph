// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { createServer } from 'node:http';
import { postgraphile } from 'postgraphile';
import { grafserv } from 'postgraphile/grafserv/node';
import { genPreset, ArgsInterface } from './config/index';

export function startServer(args: ArgsInterface) {
  const preset = genPreset(args);
  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  const server = createServer();
  server.on('error', (e) => {
    console.error(e);
  });

  serv.addTo(server).catch((e) => {
    console.error(e);
    process.exit(1);
  });

  server.listen(args.port);
  console.log(`Server listening on http://localhost:${args.port}`);

  process.on('SIGINT', () => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  process.on('uncaughtException', (e) => {
    console.error(e, 'Uncaught Exception');
    throw e;
  });

  return server;
}
