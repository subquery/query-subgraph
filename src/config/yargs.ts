// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ArgumentsCamelCase, InferredOptionTypes, Options } from 'yargs';

export const yargsOptions = {
  // TODO, unsure we need to implement this
  aggregate: {
    demandOption: false,
    default: true,
    describe: 'Enable aggregate feature',
    type: 'boolean',
  },
  name: {
    demandOption: true,
    alias: 'n',
    describe: 'Project name',
    type: 'string',
  },
  port: {
    alias: 'p',
    demandOption: false,
    describe: 'The port the service will bind to',
    type: 'number',
    default: 3000,
  },
  playground: {
    demandOption: false,
    describe: 'Enable graphql playground',
    type: 'boolean',
  },
  // TODO
  'query-limit': {
    demandOption: false,
    describe: 'Set limit on number of query results per entity',
    type: 'number',
    default: 100,
  },
  'query-timeout': {
    demandOption: false,
    describe: 'Query timeout in milliseconds',
    type: 'string',
    default: '10000',
  },
  'query-explain': {
    demandOption: false,
    describe: 'Explain query in SQL statement',
    type: 'boolean',
    default: false,
  },
  indexer: {
    demandOption: false,
    describe: 'Url that allows query to access indexer metadata',
    type: 'string',
  },
} satisfies { [key: string]: Options };

export type ArgsInterface = ArgumentsCamelCase<InferredOptionTypes<typeof yargsOptions>>;
