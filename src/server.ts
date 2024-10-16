// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { createServer } from 'node:http';
import express from 'express';
import { grafserv } from 'grafserv/express/v4';
import { postgraphile } from 'postgraphile';
import { genPreset, ArgsInterface } from './config/index';

export function startServer(args: ArgsInterface) {
  const preset = genPreset(args);
  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  const app = express();
  app.use((req, res, next) => {
    if (req.url === '/.well-known/apollo/server-health') {
      res.setHeader('Content-Type', 'application/health+json');
      res.end('{"status":"pass"}');
      return;
    }
    next();
  });
  const server = createServer(app);

  server.on('error', (e) => {
    console.error(e);
  });

  serv.addTo(app, server).catch((e) => {
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
