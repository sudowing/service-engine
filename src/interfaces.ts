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
    geoqueryType: null|string;
    softDeleteFlag: boolean;
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
