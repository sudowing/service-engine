export interface IParamsToQueryString {
  field: string;
  operation: string;
  value?: string;
}

export interface IParamsQueryParser {
  [index: string]: string;
}

export type IDefaultTypeCast = <T>(arg: T) => T;

export interface IValidatorInspectorReport {
  [index: string]: {
    type: string;
    required: boolean;
    typecast:
      | StringConstructor
      | NumberConstructor
      | BooleanConstructor
      | IDefaultTypeCast;
      validate: any;
      
  };
}
