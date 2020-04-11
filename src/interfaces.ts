export interface IParamsToQueryString {
  field: string;
  operation: string;
  value?: string;
  schema?: any;
}

export interface IParamsSearchQueryParser {
  [index: string]: string;
}

export type IDefaultTypeCast = <T>(arg: T) => T;
export type ITypeCastGeneric = <T>(arg: string) => T;
export type ITypeCastString = (arg: string) => string;
export type ITypeCastNumber = (arg: string) => number;
export type ITypeCastBoolean = (arg: string) => boolean;

export interface IValidatorInspectorReport {
  [index: string]: {
    type: string;
    required: boolean;
    keyComponent: boolean;
    geoqueryType: null | string;
    softDeleteFlag: boolean;
    updateDisabled: boolean;
    createRequired: boolean;
    createDisabled: boolean;
    typecast:
      | ITypeCastString
      | ITypeCastNumber
      | ITypeCastBoolean
      | IDefaultTypeCast;
    validate: any;
  };
}

export interface IParamsGenerateSearchQueryError {
  error: Error;
  field: string;
  type: string;
  operation: string;
}

export interface IFieldAndOperation {
  field: string;
  operation: string;
}

interface ISearchQueryComponent {
  field: string;
  rawValue: string;
  operation: string;
  type: string;
  value: string | number | boolean | string[] | number[];
}

interface ISearchQueryError {
  field: string;
  error: string;
}

export interface ISearchQueryContext {
  fields?: string;
  seperator?: string;
  notWhere?: string;
  statementContext?: string;
  orderBy?: string;
  page?: number;
  limit?: number;
}

export interface ISearchQueryResponse {
  errors: ISearchQueryError[];
  components: ISearchQueryComponent[];
  context: ISearchQueryContext;
}
