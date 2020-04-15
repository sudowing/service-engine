import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import * as cnst from "./const";
import * as ts from "./interfaces";

const _reject = Promise.reject;
const _resolve = Promise.resolve;

const castString = (arg) => String(arg);
const castNumber = (arg) => Number(arg);
const castBoolean = (arg) =>
  Boolean(cnst.FALSEY_STRING_VALUES.includes(arg) ? false : arg);
const castOther = (arg) => arg;

/**
 * @description Fn that takes string input of a data type, and returns a Fn that will convert an input into target type. Boolean defines some string inputs as falesy and returns false.
 * @param {string} type
 * @returns {(ts.ITypeCastString
 *   | ts.ITypeCastNumber
 *   | ts.ITypeCastBoolean
 *   | ts.IDefaultTypeCast
 *   | any)}
 */
export const typecastFn = (
  type: string
):
  | ts.ITypeCastString
  | ts.ITypeCastNumber
  | ts.ITypeCastBoolean
  | ts.IDefaultTypeCast
  | any => {
  switch (type) {
    case cnst.STRING:
      return castString;
    case cnst.NUMBER:
      return castNumber;
    case cnst.BOOLEAN:
      return castBoolean;
    default:
      return castOther;
  }
};

/**
 * @description Fn that takes a JOI validator as input and modifies fields (making required or totally removing) fields that are marked with appropriate SYMBOLS. This is useful so that validators that define records 1:1 with db resource DDLs (table, view, materialized view), dynamically get modified to support full CRUD operations.
 * @param {Joi.Schema} validator
 * @param {string} [operation='original']
 * @returns {Joi.Schema}
 */
export const modifyValidator = (
  validator: Joi.Schema,
  operation: string = "original"
): Joi.Schema => {
  const newValidator = cloneDeep(validator);
  newValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].forEach(
    ({ schema, id }) => {
      if (operation === cnst.CREATE) {
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_CREATE_DISABLED)
        ) {
          newValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].delete(id);
        }
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_CREATE_REQUIRED)
        ) {
          schema._flags = schema._flags
            ? { ...schema._flags, ...cnst.REQUIRED_FLAG }
            : cnst.REQUIRED_FLAG;
        }
      } else if (operation === cnst.UPDATE) {
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_UPDATE_DISABLED)
        ) {
          newValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].delete(id);
        }
      } else if (operation === cnst.READ) {
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_UNIQUE_KEY_COMPONENT)
        ) {
          schema._flags = schema._flags
            ? { ...schema._flags, ...cnst.REQUIRED_FLAG }
            : cnst.REQUIRED_FLAG;
        }
      } else if (operation === cnst.DELETE) {
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_UNIQUE_KEY_COMPONENT)
        ) {
          schema._flags = schema._flags
            ? { ...schema._flags, ...cnst.REQUIRED_FLAG }
            : cnst.REQUIRED_FLAG;
        } else {
          newValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].delete(id);
        }
      }
    }
  );
  return newValidator;
};

export const validate = {
  create: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.CREATE),
  read: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.READ),
  update: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.UPDATE),
  delete: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.READ),
  search: (validator: Joi.Schema): Joi.Schema => validator,
};

/**
 * @description Reducer Fn that inspects a given schema from fields/keys within a JOI validator object and reports meta information about the specific field. This information is used extensively in this framework for autogeneration of openapi docs, pks to use for unique records, dynamic enabling of geoquery interfaces, and typecasting of query string input before building SQL statements.
 * @param {object} accum
 * @param {*} { id, schema }
 * @returns {ts.IValidatorInspectorReport}
 */
export const reducerValidatorInspector = (
  accum: object,
  { id, schema }
): ts.IValidatorInspectorReport => ({
  ...accum,
  [id]: {
    type: schema.type,
    required: !!(schema._flags && schema._flags.presence),
    keyComponent: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_UNIQUE_KEY_COMPONENT)
    ),
    geoqueryType:
      schema._invalids && schema._invalids.has(cnst.SYMBOL_GEOQUERY)
        ? schema._invalids.has(cnst.SYMBOL_GEOQUERY_POINT)
          ? cnst.POINT
          : cnst.POLYGON
        : null,
    softDeleteFlag: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_SOFT_DELETE)
    ),
    updateDisabled: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_UPDATE_DISABLED)
    ),
    createRequired: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_CREATE_REQUIRED)
    ),
    createDisabled: !!(
      schema._invalids && schema._invalids.has(cnst.SYMBOL_CREATE_DISABLED)
    ),
    typecast: typecastFn(schema.type), // prob need dynamaic assignment for geo fields (need input as numbers and strings?)
    validate: (value: string) =>
      schema.validate((typecastFn(schema.type) as any)(value)),
  },
});

/**
 * @description Used for swagger generation and for validating user queries. Real validator cannot be used as those are plain objects and may need to validate field multiple times (sql where field <= 5 and >= 12) <-- need to validate values against field twice.
 * @param {Joi.Schema} validator
 * @returns {ts.IValidatorInspectorReport}
 */
export const validatorInspector = (
  validator: Joi.Schema
): ts.IValidatorInspectorReport =>
  (Array.from(
    validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].values()
  ) as any).reduce(reducerValidatorInspector, {});

/**
 * @description Fn that generates error message when value submitted for search is of incorrect data type.
 * @param {Error} error
 * @param {string} field
 * @returns {string}
 */
export const errorMessageInvalidValue = (error: Error, field: string): string =>
  error.message.replace(cnst.QUOTED_VALUE, `'${field}'`);

/**
 * @description Fn that generates error message when GET query produces error for various reasons. Defined errors were generated via JOI validation checks. undefined types occur when trying to query a column that doesn't exist on the record. Final fallback is for when a query operation is called on a field that is not supported.
 * @param {ts.IParamsGenerateSearchQueryError} {error, field, type, operation}
 * @returns {string}
 */
export const generateSearchQueryError = ({
  error,
  field,
  type,
  operation,
}: ts.IParamsGenerateSearchQueryError): string =>
  error
    ? errorMessageInvalidValue(error, field)
    : !type
    ? `'${field}' is not a supported property on this resource`
    : `'${operation}' operation not supported`;

/**
 * @description Fn that generates verbose error message string when specific number of args not used with a given operation. Only a few operations have specific arg lengths.
 * @param {string} operation
 * @param {any[]} values
 * @returns {string}
 */
export const badArgsLengthError = (operation: string, values: any[]): string =>
  `'${operation}' operation requires ${cnst.DEFINED_ARG_LENGTHS[operation]} args. ${values.length} were provided.`;

/**
 * @description Convenience Fn that builds array of verbose error message strings
 * @param {string} field
 */
export const concatErrorMessages = (field: string) => (
  accum,
  { error },
  i
): string[] => [
  ...accum,
  ...(error
    ? [error.message.replace(cnst.QUOTED_VALUE, `'${field}' argument #${i}`)]
    : []),
];

/**
 * @description Fn that checks to see if length of args meets the needs for a given operation. Only applies to a handful of operations, so majority default to true.
 * @param {string} operation
 * @param {any[]} values
 * @returns {boolean}
 */
export const validArgsforOperation = (
  operation: string,
  values: any[]
): boolean =>
  cnst.DEFINED_ARG_LENGTHS[operation]
    ? cnst.DEFINED_ARG_LENGTHS[operation] === values.length
    : true;

/**
 * @description Some operations on GET queries support operations via `field.operation`. A subset of these operations support multiple values seperated by commas. This `SUPPORTED_OPERATIONS` object holds a map with keys that represent all supported operations and values that define the support for multiple values. `undefined` responses to this function only occur of the operation isn't supported on the field at all.
 * @param {string} operation
 * @returns {(undefined|boolean)}
 */
export const supportMultipleValues = (operation: string): undefined | boolean =>
  cnst.SUPPORTED_OPERATIONS[operation];

/**
 * @description Some operations on GET queries support operations via `field.operation`. This `SUPPORTED_OPERATIONS` object holds a map with keys that represent all supported operations.
 * @param {string} operation
 * @returns {boolean}
 */
export const supportedOperation = (operation: string): boolean =>
  cnst.SUPPORTED_OPERATIONS.hasOwnProperty(operation);

/**
 * @description Fn that parses all GET querystring keys into fields and operations. These are set by the caller via `field.operation` syntax on all GET query string keys for searching. If `.operation` is not provided -- defaults to `.equal`.
 * @param {string} key
 * @returns {ts.IFieldAndOperation}
 */
export const parseFieldAndOperation = (key: string): ts.IFieldAndOperation => {
  const [field, op] = key.split(cnst.DOT);
  return {
    field,
    operation: op ? op : cnst.EQUAL,
  };
};

const contextTransformer = (attribute, input) => {
  switch (attribute) {
    case "fields":
      return input.split(",");
    case "orderBy":
      return input.split(",").map((fieldAndDirection) => {
        const [column, direction] = fieldAndDirection.split(":");
        return {
          column,
          order: direction && "desc" === direction ? direction : "asc",
        };
      });
    case "page":
    case "limit":
      return Number(input);
    case "notWhere":
      return !castBoolean(input); // castBoolean returns bool based on falsey input. I want to default to the opposite.
    default:
      return false;
  }
};

/**
 * @description Heart of the entire system. This Fn takes in a JOI validator and a query object (`ctx.request.query`) and submits both for processing. Search interfaces, fields & operations, are derived from the JOI validators, values from query object are typecasted to data types (if possible) using the types of each field from the JOI validator. Some query operations support multiple values seperated by commas, and this value parsing to arrays is also done here. The `context` object returned is used to build the query -- but is more superficial than the `components` which are used within the `where` part of the query. Any errors with a give query against a validator produces an array of errors, so the request can be stopped before submitting to database.
 * @param {Joi.Schema} validator
 * @param {ts.IParamsSearchQueryParser} query
 * @returns {ts.ISearchQueryResponse}
 */
export const searchQueryParser = (
  validator: Joi.Schema,
  query: ts.IParamsSearchQueryParser
): ts.ISearchQueryResponse => {
  const errors = [];
  const components = [];
  const context: ts.ISearchQueryContext = {
    ...cnst.SEARCH_QUERY_CONTEXT,
    ...(query[cnst.PIPE_SEPERATOR]
      ? { seperator: query[cnst.PIPE_SEPERATOR] }
      : {}), // support user provided seperators for fields that support multiple values
  };
  Object.entries(query).forEach(([key, rawValue]) => {
    if (key.startsWith(cnst.PIPE)) {
      const attribute = key.replace(cnst.PIPE, cnst.EMPTY_STRING);
      if (context.hasOwnProperty(attribute)) {
        const value = contextTransformer(attribute, rawValue);
        // add order by and fields values to set to ensure they're all part of the validator
        if (["fields", "orderBy"].includes(attribute)) {
          // orderBy value is an array of obects. need to map to get the field names
          const values =
            attribute === "fields" ? value : value.map(({ column }) => column);
          const unsupportedFields = values.filter(
            (field) =>
              !validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field)
          );
          // if attempting to use unsupported fields in context -- add error objects
          if (unsupportedFields.length) {
            const error = `'${attribute}' in context does not support submitted fields: ${unsupportedFields.join(
              ", "
            )}`;
            errors.push({ field: key, error });
          } else {
            context[attribute] = value;
          }
        }
      }
    } else {
      const { field, operation } = parseFieldAndOperation(key);
      const { schema } =
        validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field) || {};
      const { type } = schema || {}; // all fields have types. if undefined -- simply not a field on the resource
      const record = { field, rawValue, operation, type };
      const typecast: any = typecastFn(type);
      if (supportMultipleValues(operation)) {
        const values = rawValue.split(context.seperator).map(typecast);
        if (!validArgsforOperation(operation, values))
          errors.push({ field, error: badArgsLengthError(operation, values) });
        const validatedValues = schema
          ? values.map((value) => schema.validate(value))
          : [];
        const error = validatedValues
          .reduce(concatErrorMessages(field), [])
          .join(cnst.COMMA);
        if (error) errors.push({ field, error });
        components.push({ ...record, value: values });
      } else {
        const { value, error } = schema
          ? schema.validate(typecast(rawValue))
          : ({} as any);
        if (error || !type || !supportedOperation(operation)) {
          errors.push({
            field,
            error: generateSearchQueryError({ error, field, type, operation }),
          });
        }
        components.push({ ...record, value });
      }
    }
  });
  return { errors, components, context };
};

// this is to much dupe. can abstract and pass key.path to map
// this is to much dupe. can abstract and pass key.path to map

/**
 * @description Accepts Validator Inspection Report as input and lists all softDeleteFields (designed to only support one)
 * @param {ts.IValidatorInspectorReport} report
 */
export const softDeleteFields = (report: ts.IValidatorInspectorReport) =>
  Object.entries(report).reduce(
    (accum, [key, { softDeleteFlag }]) =>
      !softDeleteFlag ? accum : [...accum, key],
    []
  );

/**
 * @description Accepts Validator Inspection Report as input and lists all fields that are components of primary key (designed to only support one)
 * @param {ts.IValidatorInspectorReport} report
 */
export const uniqueKeyComponents = (report: ts.IValidatorInspectorReport) =>
  Object.entries(report).reduce(
    (accum, [key, { required }]) => (!required ? accum : [...accum, key]),
    []
  );

// :TODO more accurate here
// http://www.movable-type.co.uk/scripts/latlong.html

export const convertMetersToDecimalDegrees = (meters: number) =>
  meters / cnst.DD_BASE;

export const toSearchQuery = ({
  db,
  st,
  resource,
  components,
  context,
}: ts.IParamsToSearchQuery) =>
  db
    .from(resource)
    .orderBy(context.orderBy)
    .limit(context.limit)
    .offset((context.page - 1) * context.limit)
    // notWhere where/notWhere
    // statementContext and/or
    .select(context.fields)

    .where((sql) => {
      for (const { field, operation, value } of components) {
        if (cnst.BASIC_QUERY_OPERATIONS.get(operation)) {
          sql.andWhere(
            field,
            cnst.BASIC_QUERY_OPERATIONS.get(operation),
            value
          );
        } else if (operation === cnst.RANGE) {
          sql.whereBetween(field, [value[0], value[1]]);
        } else if (operation === cnst.NOT_RANGE) {
          sql.whereNotBetween(field, [value[0], value[1]]);
        } else if (operation === cnst.IN) {
          sql.whereIn([field], value as any[]);
        } else if (operation === cnst.NOT_IN) {
          sql.whereNotIn([field], value as any[]);
        } else if (operation === cnst.NULL) {
          sql.whereNull(field);
        } else if (operation === cnst.NOT_NULL) {
          sql.whereNotNull(field);
        } else if (operation === cnst.GEO_BBOX) {
          sql.andWhere(
            st.intersects(
              field,
              st.makeEnvelope(value[0], value[1], value[2], value[3], cnst.SRID)
            )
          );
        } else if (operation === cnst.GEO_RADIUS) {
          const [lat, long, meters] = value as number[];
          const coords = st.setSRID(st.makePoint(long, lat), cnst.SRID);
          sql.andWhere(
            st.dwithin(field, coords, convertMetersToDecimalDegrees(meters))
          );
        } else if (operation === cnst.GEO_POLYGON) {
          sql.andWhere(
            st.intersects(field, st.geomFromText(value as string, cnst.SRID))
          );
        }
      }

      return sql;
    });

export const validationExpander = (validator: Joi.Schema) => {
  const schema = {
    create: modifyValidator(validator, cnst.CREATE),
    read: modifyValidator(validator, cnst.READ),
    update: modifyValidator(validator, cnst.UPDATE),
    delete: modifyValidator(validator, cnst.DELETE),
    search: modifyValidator(validator, cnst.SEARCH),
  };
  const report = {
    create: validatorInspector(schema.create),
    read: validatorInspector(schema.read),
    update: validatorInspector(schema.update),
    delete: validatorInspector(schema.delete),
    search: validatorInspector(schema.search),
  };
  const meta = {
    softDeleteFields: softDeleteFields(report.read),
    uniqueKeyComponents: uniqueKeyComponents(report.read),
    searchQueryParser: (query) => searchQueryParser(validator, query),
  };

  return { schema, report, meta };

};






const validateOneOrMany = (validator: Joi.Schema, payload: any|any[]) =>
  (Array.isArray(payload) ? Joi.array().items(validator) : validator)
    .validate(payload);


/*
* -- UNIQUE Resources occur at /service/resource/record?pk=1
* CREATE (one & many)
* READ (unique & search as `search`)
* UPDATE (unique & many)
* DELETE (unique & many) (soft & hard)
* 
* NOTE: pass in query -- get errors or knex object
*/
export const ddd = (validator: Joi.Schema) => {
  const { schema, meta } = validationExpander(validator);


  // const { error, value } = processAction(payload) || if error return ELSE generate SQL return knex builder

  // UPDATE & DELETE \\ if single object // accept search query and bulk update/delete

  const processCreate = (payload, context?: any) => {
    const { error, query } = validateOneOrMany(schema.create, payload);
    if (error) return _reject(error);

  }

  const processRead = (payload, context?: any) => {
    const { error, query } = schema.read.validate(payload);
    if (error) return _reject(error);
    const output = 'some SQL query knex querybuilder'
    return _resolve(output);
  }

  const processUpdate = (payload, context?: any, searchQuery?: any) => {
    const { error, query } = validateOneOrMany(schema.update, payload);
    if (error) return _reject(error);
    if (searchQuery) {
      const validSearch = schema.search.validate(searchQuery);
      if(validSearch.error) _reject(validSearch.error);
    }
    const output = 'some SQL query knex querybuilder'
    return _resolve(output);
  };
  
  // soft delete VS hard delete defined by db query fn
  const processDelete = (payload, context?: any, searchQuery?: any, hardDelete: boolean = false) => {
    const { error, query } = validateOneOrMany(schema.update, payload);
    if (error) return _reject(error);
    if (searchQuery) {
      const validSearch = schema.search.validate(searchQuery);
      if(validSearch.error) _reject(validSearch.error);
    }
    const output = 'some SQL query knex querybuilder'
    return _resolve(output);
  };
  
  const processSearch = (payload) => {
    // validation (schema.search.validate) occurs inside QueryParser
    const { errors, components, context } = meta.searchQueryParser(payload);
    if (errors) return _reject(errors);
    const output = toSearchQuery({db, st, context, components, resource: 'some_table_or_view'});
    return _resolve(output);
  }

  return {
    create: processCreate,
    read: processRead,
    update: processUpdate,
    delete: processDelete,
    search: processSearch,
  };

};
