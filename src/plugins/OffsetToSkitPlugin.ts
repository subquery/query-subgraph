
export const OffsetToSkitPlugin: GraphileConfig.Plugin = {
  name: "OffsetToSkitPlugin",
  version: "1.0.0",

  schema: {
    hooks: {
      GraphQLObjectType_fields_field_args(args, build, context) {
        if(args["offset"]) {
          args["skit"] = args["offset"]
          delete args["offset"]
        } 
        return args
      },
    },
  },
};
