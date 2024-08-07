// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgBlockHeightPlugin} from './PgBlockHeightPlugin';

const historicalPlugins = [
  PgBlockHeightPlugin, // This must be before the other plugins to ensure the context is set

];

export default historicalPlugins;
