// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {METADATA_REGEX} from '@subql/utils';
import {makePgSmartTagsPlugin} from 'graphile-utils';
import {PgAttribute, PgClass} from "pg-introspection";

// https://github.com/graphile/crystal/issues/2029
export function CreateSchemaSmartTagsPlugin(schema:string){

  return makePgSmartTagsPlugin([
    // Set _id as the primary key for all entity expect _metadata
    // {
    //   kind: "class",
    //   match: function (entity) {
    //     const klass = entity as PgClass;
    //     return (
    //         !METADATA_REGEX.test(klass.relname) && klass.relkind === 'r' && klass.relname !== '_poi' && klass.getNamespace()?.nspname === schema
    //     );
    //   },
    //   tags: {
    //     primaryKey: "_id",
    //   },
    // },
    {
      kind: "class",
      // match: '_metadata',
      match(entity) {
        const klass = entity as PgClass;
        return (
            METADATA_REGEX.test(klass.relname) && klass.getNamespace()?.nspname === schema
        );
      },
      tags: {
        omit: "read",
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
        omit: "read",
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
        omit: "read",


      },
      description: 'Omit _id column from the node'
    },

  ])
}

export const smartTagsPlugin = makePgSmartTagsPlugin([
    // Set _id as the primary key for all entity expect _metadata
    {
      kind: "class",
      // match: '_metadata',
      match(entity) {
        const klass = entity as PgClass;
        return (
            METADATA_REGEX.test(klass.relname)
        );
      },
      tags: {
        omit: true,
      },
    },
  // Omit _block_range column
  {
    kind: "attribute",
    match(entity) {
      const attribute = entity as PgAttribute;
      return (
          /^_block_range$/.test(attribute.attname)
      );
    },
    tags: {
      omit: true,
    },
    description: 'Omit _block_range column from the node'
  },
  // Omit _id column
  {
    kind: "attribute",
    match(entity) {
      const attribute = entity as PgAttribute;
      return (
          /^_id$/.test(attribute.attname)
      );
    },
    tags: {
      omit: true,

    },
    description: 'Omit _id column from the node'
  },




])

