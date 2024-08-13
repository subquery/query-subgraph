// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {preset} from "./config"
import {postgraphile} from "postgraphile";

// Our PostGraphile instance:
export const pgl = postgraphile(preset);