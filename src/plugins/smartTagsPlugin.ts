// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {METADATA_REGEX} from '@subql/utils';
import {makePgSmartTagsPlugin} from 'graphile-utils';
import {PgAttribute, PgClass} from "pg-introspection";

// Strong recommend to set namespace for the schema, otherwise seems it will apply to all schema
export function CreateSchemaSmartTagsPlugin(schema:string){

  return makePgSmartTagsPlugin([
    // Set id unique for all entity expect _metadata
    {
      kind: "class",
      match: function (entity) {
        const klass = entity as PgClass;
        return (
            !/^_metadata$/.test(klass.relname) && klass.relkind === 'r' && klass.relname !== '_poi'
            // && klass.getNamespace()?.nspname === schema
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
            /^_metadata$/.test(klass.relname) && klass.getNamespace()?.nspname === schema
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