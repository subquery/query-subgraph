import type { PgResource, PgCodec, PgCodecAttribute } from "@dataplan/pg";
import type { GraphQLInputType, GraphQLOutputType } from "graphql";
import type { SQL } from "pg-sql2";

export type OperatorsCategory =
  | "Array"
  | "Range"
  | "Enum"
  | "Domain"
  | "Scalar";

export const $$filters = Symbol("filters");

declare global {
  namespace GraphileBuild {
//     interface SchemaOptions {
//       connectionFilterAllowedOperators?: string[];
//       connectionFilterAllowedFieldTypes?: string[];
//       connectionFilterArrays?: boolean;
//       connectionFilterComputedColumns?: boolean;
//       connectionFilterOperatorNames?: Record<string, string>;
//       connectionFilterRelations?: boolean;
//       connectionFilterSetofFunctions?: boolean;
//       connectionFilterLogicalOperators?: boolean;
//       connectionFilterAllowNullInput?: boolean;
//       connectionFilterAllowEmptyObjectInput?: boolean;
//       pgIgnoreReferentialIntegrity?: boolean;
//     }
    interface Inflection {
      tableWhereType(this: Inflection, typeName: string): string;
      tableOrderByType(this: Inflection, typeName: string): string;
      filterManyType(
        this: Inflection,
        table: PgCodec<any, any, any, any, any, any, any>,
        foreignTable: PgResource<any, any, any, any>
      ): string;
      filterSingleRelationByKeysBackwardsFieldName(
        this: Inflection,
        fieldName: string
      ): string;
      filterManyRelationByKeysFieldName(
        this: Inflection,
        fieldName: string
      ): string;
    }
    interface ScopeInputObject {
      isPgConnectionFilter?: boolean;
//       pgConnectionFilterOperators?: {
//         isList: boolean;
//         pgCodecs: ReadonlyArray<PgCodec<any, any, any, any, any, any, any>>;
//         inputTypeName: string;
//         rangeElementInputTypeName: string | null;
//         domainBaseTypeName: string | null;
//       };
//       pgConnectionFilterOperatorsCategory?: OperatorsCategory;
//       // TODO: rename these so they are scoped to this plugin!
//       fieldType?: GraphQLOutputType;
//       fieldInputType?: GraphQLInputType;
//       rangeElementInputType?: GraphQLInputType;
//       domainBaseType?: GraphQLOutputType;
      foreignTable?: PgResource<any, any, any, any>;
      isPgConnectionFilterMany?: boolean;
      isOrderByField?: boolean;

    }
    interface Build {
//       connectionFilterOperatorsDigest(
//         codec: PgCodec<any, any, any, any, any, any, any>
//       ): {
//         operatorsTypeName: string;
//         relatedTypeName: string;
//         isList: boolean;
//         inputTypeName: string;
//         rangeElementInputTypeName: string | null;
//         domainBaseTypeName: string | null;
//       } | null;
      escapeLikeWildcards(input: unknown): string;
    }
    interface ScopeInputObjectFieldsField {
      isPgConnectionFilterField?: boolean;
//       isPgConnectionFilterManyField?: boolean;
      isPgConnectionFilterOperatorLogical?: boolean;
//       isPgConnectionFilterOperator?: boolean;
    }
  }


  namespace DataplanPg {
    interface PgConditionStepExtensions {
      pgFilterAttribute?: /** Filtering a column */
      | {
            attributeName: string;
            attribute: PgCodecAttribute;
            codec?: never;
            expression?: never;
          }
        | /** The incoming alias _is_ the column */ {
            attributeName?: never;
            attribute?: never;
            codec: PgCodec<any, any, any, any, any, any, any>;
            expression?: SQL;
          };
//       pgFilterRelation?: {
//         tableExpression: SQL;
//         alias?: string;
//         localAttributes: string[];
//         remoteAttributes: string[];
//       };
    }
  }

}
