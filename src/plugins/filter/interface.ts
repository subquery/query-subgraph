import type { PgResource, PgCodec, PgCodecAttribute } from "@dataplan/pg";
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
      foreignTable?: PgResource<any, any, any, any>;
      isPgConnectionFilterMany?: boolean;
      isOrderByField?: boolean;

    }
    interface Build {
      escapeLikeWildcards(input: unknown): string;
    }
    interface ScopeInputObjectFieldsField {
      isPgConnectionFilterField?: boolean;
      isPgConnectionFilterOperatorLogical?: boolean;
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
    }
  }

}
