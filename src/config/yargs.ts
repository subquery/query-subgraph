// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getYargsOption() {
    return yargs(hideBin(process.argv))
        .env('SUBQL_QUERY')
        .options({
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
                type: 'number',
                default: 10000,
            },
            'query-explain': {
                demandOption: false,
                describe: 'Explain query in SQL statement',
                type: 'boolean',
                default:false
            }
        });
}

export function argv(arg: string): unknown {
    // @ts-ignore
    return getYargsOption().argv[arg];
}
