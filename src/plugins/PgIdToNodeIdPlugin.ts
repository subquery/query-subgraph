// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Make id rather than rowId
export const PgIdToNodeIdPlugin: GraphileConfig.Plugin = {
  name: 'IdToNodeIdPlugin',
  version: '1.0.0',
  inflection: {
    replace: {
      nodeIdFieldName() {
        return 'nodeId';
      },
      attribute(previous, options, details) {
        if (!previous) {
          throw new Error("There was no 'attribute' inflector to replace?!");
        }
        const name = previous(details);
        if (name === 'rowId') {
          return 'id';
        }
        return name;
      },
    },
  },
};
