// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { makePgSmartTagsPlugin } from 'graphile-utils';
import { PgAttribute, PgClass } from "pg-introspection";

export const METADATA_REGEX = /^_metadata$/;
export const MULTI_METADATA_REGEX = /^_metadata_[a-zA-Z0-9-]+$/;
export const MULTI_GLOBAL_REGEX = /^_global/;

// Check if class matches any internal table names that should not be exposed
function classMatches(name: string) {
  return METADATA_REGEX.test(name) || MULTI_METADATA_REGEX.test(name) || MULTI_GLOBAL_REGEX.test(name);
}

// Strong recommend to set namespace for the schema, otherwise seems it will apply to all schema
export function CreateSchemaSmartTagsPlugin(schema: string): GraphileConfig.Plugin {

  // This runs for all schemas even if ones are specified
  return makePgSmartTagsPlugin([
    // Set id unique for all entity expect _metadata
    {
      kind: "class",
      match: function (entity) {
        const klass = entity as PgClass;
        if (!klass.getAttributes().find((attr => attr.attname === 'id'))) {
          return false;
        }
        return (
          !classMatches(klass.relname) && klass.relkind === 'r' && klass.relname !== '_poi'
          // && klass.getNamespace()?.nspname === schema
          // We want this limit to current schema, but this seems will break rest of code
        );
      },
      tags: {
        unique: ["id"],
      },
    },
    {
      kind: "class",
      match(entity) {
        const klass = entity as PgClass;
        return (
          classMatches(klass.relname) && klass.getNamespace()?.nspname === schema
        );
      },
      tags: {
        behavior: "-*",
      },
      description: 'Omit _metadata table from the query'

    },
    // Omit _block_range column
    {
      kind: "attribute",
      match(entity) {
        const attribute = entity as PgAttribute;
        return (
          /^_block_range$/.test(attribute.attname) && attribute.getClass()?.getNamespace()?.nspname === schema
        );
      },
      tags: {
        behavior: "-*",
      },
      description: 'Omit _block_range column from the node'
    },
    // Omit _id column
    {
      kind: "attribute",
      match(entity) {
        const attribute = entity as PgAttribute;
        return (
          /^_id$/.test(attribute.attname) && attribute.getClass()?.getNamespace()?.nspname === schema
        );
      },
      tags: {
        behavior: "-*",
      },
      description: 'Omit _id column from the node'
    },
  ])
}
