// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { yargsOptions } from './config/yargs';
import { startServer } from './server';

yargs(hideBin(process.argv))
  .command('$0', 'Run an query-subgraph server', yargsOptions, (argv) => {
    startServer(argv);
  })
  .help().argv;
