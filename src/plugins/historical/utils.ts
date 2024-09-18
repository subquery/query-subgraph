// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphileBuild} from "graphile-build";
import {SQL} from 'pg-sql2';

export function makeRangeQuery(tableName: SQL, blockHeight: SQL, sql: any): SQL {
  return sql`${tableName}._block_range @> ${blockHeight}`;
}

// Used to filter out _block_range attributes
export function hasBlockRange(scope: GraphileBuild.ScopeObjectFieldsField): boolean {

  if(scope.isPgClassType){
    return Boolean(scope.pgCodec?.attributes._block_range);
  }
  return false
}