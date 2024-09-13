// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import yargs from 'yargs/yargs';
import { yargsOptions } from './config/yargs';
import { startServer } from './server';

yargs(process.argv.slice(2))
  .command('$0', 'Run an query-subgraph server', yargsOptions, (argv) => {
    startServer(argv);
  })
  .help().argv;
