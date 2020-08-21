import * as bunyan from "bunyan";
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

export interface IQueryContextResponse {
  errors: ISearchQueryError[];
  context: ISearchQueryContext;
}

export interface ISearchQueryResponse {
  errors: ISearchQueryError[];
  components: ISearchQueryComponent[];
}

export interface IParamsGenerateOperations {
  db: knex;
  st: knexPostgis.KnexPostgis;
  validator: Joi.Schema;
  resource: string;
}

export interface IParamsQueryCore {
  db: knex;
  st: knexPostgis.KnexPostgis;
  resource: string;
  context: ISearchQueryContext;
  schemaResource: ISchemaResource;
}

export interface IParamsToQueryBase extends IParamsQueryCore {
  query: any | any[];
}
export interface IParamsToQueryWithSearch extends IParamsToQueryBase {
  searchQuery: any;
}

export interface IParamsToDeleteQueryWithSearch
  extends IParamsToQueryWithSearch {
  hardDelete?: boolean;
}

export interface IParamsToSearchQuery extends IParamsQueryCore {
  components: ISearchQueryComponent[];
  subqueryOptions?: ISubqueryOptions
}

export interface IParamsProcessBase {
  payload: any;
  context?: any;
  requestId: string;
  apiType: string;
}

export interface IParamsProcessWithSearch extends IParamsProcessBase {
  searchQuery?: any;
}

export interface IParamsProcessDelete extends IParamsProcessWithSearch {
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

export interface IResourceQueryBase {
  db: knex;
  st: knexPostgis.KnexPostgis;
  resource: string;
}

export interface IParamsControllerSpecs {
  unique: boolean;
}

export interface IServiceOperationsResult {
  sql: knex.QueryBuilder;
}

export type ICreateOperation = ({
  payload,
}: IParamsProcessBase) => Promise<IServiceOperationsResult>;
export type IReadOperation = ({
  payload,
}: IParamsProcessBase) => Promise<IServiceOperationsResult>;
export type IUpdateOperation = ({
  payload,
  searchQuery,
}: IParamsProcessWithSearch) => Promise<IServiceOperationsResult>;
export type IDelOperation = ({
  payload,
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

export interface IValidationExpanderSchema {
  create: Joi.Schema;
  read: Joi.Schema;
  update: Joi.Schema;
  delete: Joi.Schema;
  search: Joi.Schema;
}
export interface IValidationExpanderReport {
  create: IValidatorInspectorReport;
  read: IValidatorInspectorReport;
  update: IValidatorInspectorReport;
  delete: IValidatorInspectorReport;
  search: IValidatorInspectorReport;
}
export interface IValidationExpanderMeta {
  softDeleteFields: any[];
  uniqueKeyComponents: any[];
  searchQueryParser: (query: any, context?: any) => ISearchQueryResponse;
}

export interface TResponseGenerics {
  create: TResponseGenericCreate;
  read: TResponseGenericRead;
  update: TResponseGenericUpdate;
  delete: TResponseGenericDelete;
}

export interface IValidationExpander {
  schema: IValidationExpanderSchema;
  report: IValidationExpanderReport;
  meta: IValidationExpanderMeta;
}

export type IObjectTransformer = (obj: object) => object;

export interface IObjectTransformerMap {
  [index: string]: IObjectTransformer;
}

export interface IClassResourceMap {
  [index: string]: IClassResource;
}

export interface IClassResourceConstructor {
  db: knex;
  st: knexPostgis.KnexPostgis;
  logger: bunyan;
  name: string;
  validator: Joi.Schema;
  schemaResource: ISchemaResource;
  middlewareFn?: IObjectTransformer;
  subResourceName?: string;
  aggregationFn?: TKnexSubQuery;
}

export interface IClassResource {
  db: knex;
  st: knexPostgis.KnexPostgis;
  logger: bunyan;
  name: string;
  validator: Joi.Schema;
  schemaResource: ISchemaResource;
  middlewareFn?: IObjectTransformer;
  schema: IValidationExpanderSchema;
  report: IValidationExpanderReport;
  meta: IValidationExpanderMeta;
  generics: TResponseGenerics;
  hasSubquery: boolean;
  subResourceName?: string;
  aggregationFn?: TKnexSubQuery;

  queryBase(): IResourceQueryBase;
  contextParser(input: IParamsProcessBase): IResourceContextParserResponse;

  create(payload: IParamsProcessBase): IRejectResource | IResolveResource;
  read(payload: IParamsProcessBase): IRejectResource | IResolveResource;
  update(payload: IParamsProcessWithSearch): IRejectResource | IResolveResource;
  delete(payload: IParamsProcessDelete): IRejectResource | IResolveResource;
  search(payload: IParamsProcessBase, subqueryOptions?: ISubqueryOptions): IRejectResource | IResolveResource;
}

export interface ISubqueryOptions {
  subqueryContext?: boolean;
  subquery?: knex.QueryBuilder;
  aggregationFn?: TKnexSubQuery;
}

export type TKnexSubQuery = (query: knex.QueryBuilder) => knex.QueryBuilder

export interface IComplexResourceConfig {
  topResourceName: string;
  subResourceName: string;
  aggregationFn: TKnexSubQuery;
}

export interface IRejectResource {
  errorType: string;
  error: Error;
  result?: undefined;
}

export interface IResolveResource {
  errorType?: undefined;
  error?: undefined;
  result: {
    sql: knex.QueryBuilder;
    context: ISearchQueryContext;
    query: any;
  };
}

export interface IResourceContextParserResponse extends IRejectResource {
  context: ISearchQueryContext;
}

export type TResponseGenericCreate = (
  input: IParamsProcessBase
) => IRejectResource | IResolveResource;

export type TResponseGenericRead = (
  input: IParamsProcessBase
) => IRejectResource | IResolveResource;

export type TResponseGenericUpdate = (
  input: IParamsProcessWithSearch
) => IRejectResource | IResolveResource;

export type TResponseGenericDelete = (
  input: IParamsProcessDelete
) => IRejectResource | IResolveResource;

export interface IDatabaseBootstrap {
  db: knex;
}

export interface IDatabaseBootstrapRaw extends IDatabaseBootstrap {
  dbResourceRawRows: any;
  joiBase: any;
}

export type TDatabaseResources = [string, Joi.Schema];

export interface IServiceResolverResponse {
  data: any | any[] | null;
  sql: string;
  count?: number;
  debug: {
    now: number;
    reqId: any;
    input: {
      payload: any;
      context: any;
      options: any;
    };
    serviceResponse: any;
  };
}

export interface ISchemaResource {
  resource_schema: string;
  resource_name: string;
}
