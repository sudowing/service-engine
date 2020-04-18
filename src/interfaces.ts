import * as Joi from "@hapi/joi";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

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
  fields?: string[];
  seperator?: string;
  notWhere?: string;
  statementContext?: string;
  orderBy?: {
    column: string;
    order: string;
  }[];
  page?: number;
  limit?: number;
}

export interface ISearchQueryResponse {
  errors: ISearchQueryError[];
  components: ISearchQueryComponent[];
  context: ISearchQueryContext;
}

export interface IParamsGenerateOperations {
  db: knex;
  st: knexPostgis.KnexPostgis;
  validator: Joi.Schema;
  resource: string;
}

export interface IParamsToSearchQuery extends ZZZZ {
  components: ISearchQueryComponent[];
}

export interface ZZZZ {
  db: knex;
  st: knexPostgis.KnexPostgis;
  resource: string;
  context: ISearchQueryContext;
}

export interface IParamsProcessBase {
  payload: any;
  context?: ISearchQueryContext;
}

export interface IParamsProcessWithSearch extends IParamsProcessBase {
  searchQuery?: any;
}

export interface IParamsProcessDelete extends IParamsProcessWithSearch {
  hardDelete?: boolean;
}

export interface IParamsToQueryBase extends ZZZZ {
  query: any | any[];
}

export interface IParamsToQueryWithSearch extends IParamsToQueryBase {
  searchQuery: any;
}

export interface IParamsToDeleteQueryWithSearch
  extends IParamsToQueryWithSearch {
  hardDelete?: boolean;
}

export interface IServiceResource {
  [index: string]: Joi.Schema;
}

export interface IServiceConfig {
  db: knex;
  st: knexPostgis.KnexPostgis;
  resources: IServiceResource;
}

export interface IParamsControllerSpecs {
  unique: boolean;
}

export interface IServiceOperationsResult {
  sql: knex.QueryBuilder;
}

export type ICreateOperation = ({
  payload,
  context,
}: IParamsProcessBase) => Promise<IServiceOperationsResult>;
export type IReadOperation = ({
  payload,
  context,
}: IParamsProcessBase) => Promise<IServiceOperationsResult>;
export type IUpdateOperation = ({
  payload,
  context,
  searchQuery,
}: IParamsProcessWithSearch) => Promise<IServiceOperationsResult>;
export type IDelOperation = ({
  payload,
  context,
  searchQuery,
  hardDelete,
}: IParamsProcessDelete) => Promise<IServiceOperationsResult>;
export type ISearchOperation = (
  payload: any
) => Promise<IServiceOperationsResult>;

export type IOperation =
  | ICreateOperation
  | IReadOperation
  | IUpdateOperation
  | IDelOperation
  | ISearchOperation;

export interface IServiceOperations {
  create: ICreateOperation;
  read: IReadOperation;
  update: IUpdateOperation;
  del: IDelOperation;
  search: ISearchOperation;
}
