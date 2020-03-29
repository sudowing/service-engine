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

export interface IValidatorInspectorReport {
  [index: string]: {
    type: string;
    required: boolean;
    geoqueryType: null|string;
    softDeleteFlag: boolean;
    typecast:
      | StringConstructor
      | NumberConstructor
      | BooleanConstructor
      | IDefaultTypeCast;
      validate: any;
      
  };
}
