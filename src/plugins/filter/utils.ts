// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type { FieldArgs } from 'grafast';
import {
  GraphQLInputType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLString,
} from 'graphql';

export enum Operators {
  EQUAL_TO = '',
  NOT = 'not',
  IN = 'in',
  NOT_IN = 'not_in',
  GT = 'gt',
  LT = 'lt',
  GTE = 'gte',
  LTE = 'lte',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  CONTAINS_NOCASE = 'contains_nocase',
  NOT_CONTAINS_NOCASE = 'not_contains_nocase',
  STARTS_WITH = 'starts_with',
  STARTS_WITH_NOCASE = 'starts_with_nocase',
  NOT_STARTS_WITH = 'not_starts_with',
  NOT_STARTS_WITH_NOCASE = 'not_starts_with_nocase',
  ENDS_WITH = 'ends_with',
  ENDS_WITH_NOCASE = 'ends_with_nocase',
  NOT_ENDS_WITH = 'not_ends_with',
  NOT_ENDS_WITH_NOCASE = 'not_ends_with_nocase',
}

// refer https://github.com/graphile/crystal/blob/main/grafast/dataplan-pg/src/codecs.ts#L1116-L1117
export function getSupportOperators(fieldType: string): Operators[] {
  switch (fieldType) {
    case 'bool':
      return [Operators.EQUAL_TO, Operators.NOT, Operators.IN, Operators.NOT_IN];
    case 'bytea':
      return [
        Operators.EQUAL_TO,
        Operators.NOT,
        Operators.GT,
        Operators.LT,
        Operators.GTE,
        Operators.LTE,
        Operators.IN,
        Operators.NOT_IN,
        Operators.CONTAINS,
        Operators.NOT_CONTAINS,
      ];
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float8':
    case 'float4':
    case 'numeric':
    case 'timestamp':
      return [
        Operators.EQUAL_TO,
        Operators.NOT,
        Operators.GT,
        Operators.LT,
        Operators.GTE,
        Operators.LTE,
        Operators.IN,
        Operators.NOT_IN,
      ];
    case 'varchar':
    case 'text':
      return [
        Operators.EQUAL_TO,
        Operators.NOT,
        Operators.GT,
        Operators.LT,
        Operators.GTE,
        Operators.LTE,
        Operators.IN,
        Operators.NOT_IN,
        Operators.CONTAINS,
        Operators.CONTAINS_NOCASE,
        Operators.NOT_CONTAINS,
        Operators.NOT_CONTAINS_NOCASE,
        Operators.STARTS_WITH,
        Operators.STARTS_WITH_NOCASE,
        Operators.NOT_STARTS_WITH,
        Operators.NOT_STARTS_WITH_NOCASE,
        Operators.ENDS_WITH,
        Operators.ENDS_WITH_NOCASE,
        Operators.NOT_ENDS_WITH,
        Operators.NOT_ENDS_WITH_NOCASE,
      ];
    default:
      return [];
  }
}

export function ConvertGraphqlType(fieldType: string): GraphQLInputType | undefined {
  switch (fieldType) {
    case 'bool':
      return GraphQLBoolean;
    case 'bytea':
      return GraphQLString;
    case 'int2':
    case 'int4':
    case 'float8':
    case 'float4':
    case 'numeric':
      return GraphQLFloat;
    case 'int8':
    case 'timestamp':
      return GraphQLString;
    case 'varchar':
    case 'text':
      return GraphQLString;
    default:
      return undefined;
  }
}

export function getFieldDefine(
  build: GraphileBuild.Build,
  fieldName: string,
  fieldType: string,
  operator: Operators
) {
  const { inflection } = build;
  const operatorFieldName =
    operator === Operators.EQUAL_TO
      ? inflection.camelCase(fieldName)
      : `${inflection.camelCase(fieldName)}_${operator}`;

  const graphqlType = ConvertGraphqlType(fieldType);
  if (!graphqlType) return;

  return {
    operatorFieldName,
    type: ![Operators.IN, Operators.NOT_IN].includes(operator)
      ? graphqlType
      : new GraphQLList(graphqlType),
  };
}

// TODO: rename. (Checks that the arguments aren't null/empty.)
export function makeAssertAllowed(build: GraphileBuild.Build) {
  const { EXPORTABLE } = build;

  const connectionFilterAllowNullInput = false;
  const connectionFilterAllowEmptyObjectInput = false;

  const assertAllowed = EXPORTABLE(
    (connectionFilterAllowEmptyObjectInput, connectionFilterAllowNullInput) =>
      function (fieldArgs: FieldArgs, mode: 'list' | 'object' | 'scalar') {
        const $raw = fieldArgs.getRaw();
        if (
          mode === 'object' &&
          !connectionFilterAllowEmptyObjectInput &&
          'evalIsEmpty' in $raw &&
          $raw.evalIsEmpty()
        ) {
          throw Object.assign(new Error('Empty objects are forbidden in filter argument input.'), {
            //TODO: mark this error as safe
          });
        }
        if (mode === 'list' && !connectionFilterAllowEmptyObjectInput && 'evalLength' in $raw) {
          const l = $raw.evalLength();
          if (l !== null) {
            for (let i = 0; i < l; i++) {
              const $entry = $raw.at(i);
              if ('evalIsEmpty' in $entry && $entry.evalIsEmpty()) {
                throw Object.assign(
                  new Error('Empty objects are forbidden in filter argument input.'),
                  {
                    //TODO: mark this error as safe
                  }
                );
              }
            }
          }
        }
        // For all modes, check null
        if (!connectionFilterAllowNullInput && $raw.evalIs(null)) {
          throw Object.assign(new Error('Null literals are forbidden in filter argument input.'), {
            //TODO: mark this error as safe
          });
        }
      },
    [connectionFilterAllowEmptyObjectInput, connectionFilterAllowNullInput]
  );
  return assertAllowed;
}
