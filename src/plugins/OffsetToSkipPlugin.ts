// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export const OffsetToSkipPlugin: GraphileConfig.Plugin = {
  name: "OffsetToSkipPlugin",
  version: "1.0.0",

  schema: {
    hooks: {
      GraphQLObjectType_fields_field_args(args, build, context) {
        if(args.offset) {
          args.skip = args.offset
          delete args.offset
        } 
        return args
      },
    },
  },
};
