import { Buffer } from "buffer";

import * as fs from "fs";
import * as path from "path";

import * as Joi from "joi";
import { pascalCase, snakeCase } from "change-case";
import { cloneDeep } from "lodash";
import * as wkx from "wkx";

import * as cnst from "./const";
import * as ts from "./interfaces";

/**
 * @description reducer that seperates fulfilled promises from those rejected. Used in places with Promise.AllSettled is implemented on async validators to quickly check for failures.
 * @param {*} accum
 * @param {*} { status, value, reason }
 * @returns
 */
const transformSettledValidation = (accum, { status, value, reason }) => {
  if (status === "fulfilled") {
    accum.values.push(value);
  } else {
    accum.errors.push(reason._original);
  }
  return accum;
};

/**
 * @description reduces settled array of validators to seperate valid values from errors
 * @param {*} settledPromises
 */
const reduceSettledAsyncValidation = (settledPromises) =>
  settledPromises.reduce(transformSettledValidation, {
    values: [],
    errors: [],
  });

/**
 * @description casts input as string. used as inputs are passed to validators.
 * @param {*} arg
 */
export const castString = (arg) => String(arg);

/**
 * @description attempts to case value as Number. if NaN - casts as verbose string that will fail validation and get returned to the user. used as inputs are passed to validators.
 * @param {*} arg
 * @returns
 */
export const castNumber = (arg) => {
  const n = Number(arg);
  return !Number.isNaN(n)
    ? n
    : `number conversion failed to provide meaningful value (${arg} = NaN)`;
};

/**
 * @description attempts to cast falsey values to Boolean False. used as inputs are passed to validators.
 * @param {*} arg
 */
export const castBoolean = (arg) =>
  Boolean(cnst.FALSEY_STRING_VALUES.includes(arg) ? false : arg);

/**
 * @description
 * @param {*} arg
 */
export const castOther = (arg) => arg;

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
        // required all pk fields for update
        if (
          schema._invalids &&
          schema._invalids.has(cnst.SYMBOL_UNIQUE_KEY_COMPONENT)
        ) {
          schema._flags = schema._flags
            ? { ...schema._flags, ...cnst.REQUIRED_FLAG }
            : cnst.REQUIRED_FLAG;
        }

        // blacklist immutable fields (future feature to set via config)
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
  /**
   * @description
   * @param {Joi.Schema} validator
   * @returns {Joi.Schema}
   */
  create: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.CREATE),
  /**
   * @description
   * @param {Joi.Schema} validator
   * @returns {Joi.Schema}
   */
  read: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.READ),
  /**
   * @description
   * @param {Joi.Schema} validator
   * @returns {Joi.Schema}
   */
  update: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.UPDATE),
  /**
   * @description
   * @param {Joi.Schema} validator
   * @returns {Joi.Schema}
   */
  delete: (validator: Joi.Schema): Joi.Schema =>
    modifyValidator(validator, cnst.READ),
  /**
   * @description
   * @param {Joi.Schema} validator
   * @returns {Joi.Schema}
   */
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
    // TODO: add json type. will be needed by grpc `jsonToStructs` in grpc.methods
    geoqueryType:
      schema._invalids && schema._invalids.has(cnst.SYMBOL_GEOQUERY)
        ? schema._invalids.has(cnst.SYMBOL_GEOQUERY_POINT)
          ? cnst.POINT
          : cnst.POLYGON
        : null,
    jsonType: !!(schema._invalids && schema._invalids.has(cnst.SYMBOL_JSON)),
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
      schema.validateAsync((typecastFn(schema.type) as any)(value)), // this needs to be async validation
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

// description Fn that generates error message when value submitted for search is of incorrect data type.
export const errorMessageInvalidValue = (
  field: string,
  message: string
): string => `'${field}': ${message}`;

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
    ? errorMessageInvalidValue(field, error)
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
 * @description builds verbose string with multiple references specific to why a given request failed
 * @param {string} field
 */
export const defineValidationErrorMessage = (field: string) => (message, i) =>
  `'${field}' argument #${i}: ${message}`;

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
 * @returns {(boolean)}
 */
export const supportMultipleValues = (operation: string): boolean =>
  !!cnst.SUPPORTED_OPERATIONS[operation];

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

/**
 * @description Used to transform context arguments sent in GraphQL and gRPC to REST standard -- so all requests can get processed by complex middleware.
 * @param {*} attribute
 * @param {*} input
 * @returns
 */
export const contextTransformer = (attribute, input) => {
  switch (attribute) {
    case cnst.FIELDS:
      return input.split(cnst.COMMA);
    case cnst.ORDERBY:
      return input.split(cnst.COMMA).map((fieldAndDirection) => {
        const [column, direction] = fieldAndDirection.split(cnst.COLON);
        return {
          column,
          order: direction && cnst.DESC === direction ? direction : cnst.ASC,
        };
      });
    case cnst.PAGE:
    case cnst.LIMIT:
      return Number(input);
    case cnst.NOTWHERE:
      return !castBoolean(input); // castBoolean returns bool based on falsey input. I want to default to the opposite.
    default:
      return false;
  }
};

/**
 * @description The Heart of the entire system. This Fn takes in a JOI validator and a query object (`ctx.request.query`) and submits both for processing. Search interfaces, fields & operations, are derived from the JOI validators, values from query object are typecasted to data types (if possible) using the types of each field from the JOI validator. Some query operations support multiple values seperated by commas, and this value parsing to arrays is also done here. The `context` object returned is used to build the query -- but is more superficial than the `components` which are used within the `where` part of the query. Any errors with a give query against a validator produces an array of errors, so the request can be stopped before submitting to database.
 * @param {Joi.Schema} validator
 * @param {ts.IParamsSearchQueryParser} query
 * @returns {Promise<ts.ISearchQueryResponse>}
 * @promise searchQueryParserPromise
 * @fulfill {ts.ISearchQueryResponse}
 * @reject {ts.ISearchQueryResponse}
 * @returns searchQueryParserPromise
 */
export const searchQueryParser = async (
  validator: Joi.Schema,
  query: ts.IParamsSearchQueryParser,
  apiType: string,
  seperator?: string
): Promise<ts.ISearchQueryResponse> => {
  const errors = [];
  const components = [];
  const sep = seperator || cnst.SEARCH_QUERY_CONTEXT.seperator;

  // TODO: // make a pure fn. maybe curry to inject the dependencies and return the mutated thing
  const parseSearchQueryEntry = async ([key, rawValue]) => {
    const { field, operation } = parseFieldAndOperation(key);
    const { schema } =
      validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {}; // all fields have types. if undefined -- simply not a field on the resource
    const record = { field, rawValue, operation, type };
    const typecast: any = typecastFn(type);

    if (schema && supportMultipleValues(operation)) {
      const values = rawValue.split(sep).map(typecast);

      if (!validArgsforOperation(operation, values))
        errors.push({ field, error: badArgsLengthError(operation, values) });

      const asyncValidation = Promise.allSettled(
        values.map((item) => schema.validateAsync(item))
      );

      const { values: _values, errors: _errors } = await asyncValidation.then(
        reduceSettledAsyncValidation
      );

      const error = _errors
        .map(defineValidationErrorMessage(field))
        .join(cnst.COMMA);
      if (error) errors.push({ field, error });

      components.push({ ...record, value: _values });
    } else {
      const asyncValidation = schema
        ? schema.validateAsync(typecast(rawValue))
        : Promise.resolve({}); // this get's ignored in the `!type` check later

      const { value, error } = await asyncValidation
        .then((_value) => ({ value: _value }))
        .catch((err) => ({ error: err._original }));

      if (error || !type || !supportedOperation(operation)) {
        errors.push({
          field,
          error: generateSearchQueryError({ error, field, type, operation }),
        });
      }
      components.push({ ...record, value });
    }
  };

  await Promise.all(Object.entries(query || {}).map(parseSearchQueryEntry));

  return { errors, components };
};

/**
 * @description produces query context object. For REST calls, first parses query string to assemble base arguments. Then checks for things like return fields or ordering fields do not exist.
 * @param {Joi.Schema} validator
 * @param {ts.IParamsSearchQueryParser} query
 * @param {string} apiType
 * @returns {ts.IQueryContextResponse}
 */
export const queryContextParser = (
  validator: Joi.Schema,
  query: ts.IParamsSearchQueryParser,
  apiType: string
): ts.IQueryContextResponse => {
  const errors = [];
  const context: ts.ISearchQueryContext = {
    ...cnst.SEARCH_QUERY_CONTEXT,
    ...(query[cnst.SEPERATOR] ? { seperator: query[cnst.SEPERATOR] } : {}), // support user provided seperators for fields that support multiple values
  };

  Object.entries(query).forEach(([key, rawValue]) => {
    if (context.hasOwnProperty(key)) {
      let value: any = rawValue;
      if (apiType === "REST") {
        // NEED TO SKIP THIS FOR GRAPHQL & GRPC CALLS -- they'll send the arrays & types
        value = contextTransformer(key, rawValue);
      }

      // add order by and fields values to set to ensure they're all part of the validator
      if (["fields", "orderBy"].includes(key)) {
        // orderBy value is an array of obects. need to map to get the field names
        const values =
          key === "fields" ? value : value.map(({ column }) => column);
        const unsupportedFields = values.filter(
          (field) =>
            !validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field)
        );
        // if attempting to use unsupported fields in context -- add error objects
        if (unsupportedFields.length) {
          const error = `'${key}' in context does not support submitted fields: ${unsupportedFields.join(
            ", "
          )}`;
          errors.push({ field: key, error });
        } else {
          context[key] = value;
        }
      } else {
        context[key] = value;
      }
    }
  });
  return { errors, context };
};

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

/**
 * @description conversion of meters to units used in spatial queries
 * @param {number} meters
 */
export const metersToDecimalDegrees = (meters: number) => meters / cnst.DD_BASE;

/**
 * @description A core component of entire system. Each DB resource gets a single validator built on first pass that checks for types and values. This fn derives CRUD & Search specific validators from that original -- and applies flags to keys used in delete, update and read. The REPORT object, reviews each generated validator and generates an object describing each that is used for various logic through the system. Is simplier to perform here a single time and produce a comprehensive report object than continualy checking various properties (often deeply nested and private) in the validator.
 * @param {Joi.Schema} validator
 * @returns {ts.IValidationExpander}
 */
export const validationExpander = (
  validator: Joi.Schema
): ts.IValidationExpander => {
  const schema: ts.IValidationExpanderSchema = {
    create: modifyValidator(validator, cnst.CREATE),
    read: modifyValidator(validator, cnst.READ),
    update: modifyValidator(validator, cnst.UPDATE),
    delete: modifyValidator(validator, cnst.DELETE),
    search: modifyValidator(validator, cnst.SEARCH),
  };
  const report: ts.IValidationExpanderReport = {
    create: validatorInspector(schema.create),
    read: validatorInspector(schema.read),
    update: validatorInspector(schema.update),
    delete: validatorInspector(schema.delete),
    search: validatorInspector(schema.search),
  };
  const meta: ts.IValidationExpanderMeta = {
    softDeleteFields: softDeleteFields(report.read),
    uniqueKeyComponents: uniqueKeyComponents(report.read),
    /**
     * @description
     * @param {*} query
     * @param {*} apiType
     * @param {*} context
     */
    searchQueryParser: (query, apiType, context) =>
      searchQueryParser(
        validator,
        query,
        apiType,
        context && context.sep ? context.sep : undefined
      ),
  };

  return { schema, report, meta };
};

// need to remove context keys

/**
 * @description Used to standardize validation. Want to workwith single input and array of inputs as REST, GraphQL and gRPC can take 1 or many records.
 * @param {Joi.Schema} validator
 * @param {(any | any[])} payload
 */
export const validateOneOrMany = (
  validator: Joi.Schema,
  payload: any | any[]
) =>
  !Array.isArray(payload)
    ? validator.validateAsync(payload)
    : Joi.array().items(validator).validateAsync(payload);

export const removeContextKeys = (context, payload) => {
  const contextFreePayload = { ...payload };
  Object.keys(context).forEach((item) => {
    delete contextFreePayload[item];
  });
  return contextFreePayload;
};

/**
 * @description Transforms input into object with `errorType` & `error` keys
 * @param {string} errorType
 * @param {*} error
 * @returns {ts.IRejectResource}
 */
export const rejectResource = (
  errorType: string,
  error
): ts.IRejectResource => ({
  errorType,
  error,
});

/**
 * @description Transforms input into object with `result` key set to the input value
 * @param {*} result
 * @returns {ts.IResolveResource}
 */
export const resolveResource = (result): ts.IResolveResource => ({ result });

/**
 * @description generates URL paths for each resource. Applies a specific prefix to each.
 * @param {string} resource
 * @param {string} [prefix="service"]
 */
export const nameRestEndpointGetRecords = (
  resource: string,
  prefix: string = "service"
) => ({
  resourceEndpoint: `/${prefix}/${resource}`,
  uniqueEndpoint: `/${prefix}/${resource}/record`,
});

/**
 * @description Adds invalid `key` flag to any validator for a field that is used as a key
 * @param {Joi.Schema} joi
 * @param {boolean} keyComponent
 */
export const joiKeyComponent = (joi: Joi.Schema, keyComponent: boolean) =>
  keyComponent ? joi.invalid(cnst.SYMBOL_UNIQUE_KEY_COMPONENT) : joi;

/**
 * @description DISABLED FOR EVAL. Goal was to modify validator for required fields. would be used in `genDatabaseResourceValidators`
 * @param {Joi.Schema} joi
 * @param {boolean} required
 */
export const joiRequired = (joi: Joi.Schema, required: boolean) =>
  required ? joi : joi; // need to eval .required() here... think it's breaking the framework

/**
 * @description Generates JOI validators for each resource reported in the dbSurveyQuery. Basis of entire system. Also generates dbResources Map -- which contains the survey results -- but in a better format for use through the system.
 * @param {ts.IDatabaseBootstrapRaw} {
 *   db,
 *   dbResourceRawRows,
 *   joiBase,
 * }
 * @returns
 */
export const genDatabaseResourceValidators = async ({
  db,
  dbResourceRawRows,
  joiBase,
}: ts.IDatabaseBootstrapRaw) => {
  const resources = dbResourceRawRows.reduce(
    (
      catalog,
      {
        resource_schema,
        resource_type,
        resource_name,
        resource_column_id,
        resource_column_name,
        notnull,
        type,
        primarykey,
        uniquekey,
        foreignkey_fieldnum,
        foreignkey,
        foreignkey_connnum,
      }
    ) => {
      // this needs to be a fn as the upstream map generates the same string `mapSchemaResources`
      const resourceName = `${resource_schema}_${resource_name}`;
      if (!catalog[resourceName]) catalog[resourceName] = {};
      catalog[resourceName][resource_column_name] = joiKeyComponent(
        joiBase(type),
        primarykey
      );
      return catalog;
    },
    {}
  );

  const dbResources = dbResourceRawRows.reduce((collection, record) => {
    const resourceName = `${record.resource_schema}_${record.resource_name}`;

    if (!collection[resourceName]) collection[resourceName] = {};
    collection[resourceName][record.resource_column_name] = record;
    return collection;
  }, {});

  const validators = Object.entries(resources).reduce(
    (jois, [key, value]: [string, object]) => ({
      ...jois,
      [key]: Joi.object(value),
    }),
    {}
  );

  return { validators, dbResources };
};

/**
 * @description Builds two objects from one by matching on key prefixes
 * @param {*} payload
 * @param {string} prefix
 * @returns {[ts.IObjectStringByString, ts.IObjectStringByString]}
 */
export const seperateByKeyPrefix = (
  payload: any,
  prefix: string
): [ts.IObjectStringByString, ts.IObjectStringByString] => {
  const payloadWithoutPrefix = {};
  const payloadWithPrefix = {};
  Object.keys(payload || {}).forEach((key) => {
    if (key.startsWith(prefix)) {
      // remove the lead char from the key -- as its utility ends here
      payloadWithPrefix[key.substring(1)] = payload[key];
    } else {
      payloadWithoutPrefix[key] = payload[key];
    }
  });
  return [payloadWithPrefix, payloadWithoutPrefix];
};

/**
 * @description Used for applying complex middleware to subqueries for all service calls and parsing subPayload from REST
 * @param {ts.IClassResourceMap} resourcesMap
 * @param {string} resourceName
 * @param {string} operation
 * @param {*} payload
 * @param {*} [subPayload]
 * @returns
 */
export const callComplexResource = async (
  resourcesMap: ts.IClassResourceMap,
  resourceName: string,
  operation: string,
  payload: any,
  subPayload?: any // subpayloads are passed from GraphQL. else they are parsed from REST `payload`
) => {
  if (!subPayload) {
    // TODO: this block needs to be a single fn thats isolated and testable
    const [_subPayload, _restPayload] = seperateByKeyPrefix(
      payload.payload,
      ">"
    );
    const [_subContext, topPayload] = seperateByKeyPrefix(_restPayload, "]");
    subPayload = {
      ...payload,
      payload: _subPayload,
      context: _subContext,
    };
    payload.payload = topPayload;
  }

  const resource = resourcesMap[resourceName];
  const subquery = await resourcesMap[resource.subResourceName][
    operation
  ](subPayload, { subqueryContext: true });

  // need to return the 400 already
  if (!subquery.result) return subquery;

  const aggregationFn = resource.aggregationFn;
  return resource[operation](payload, {
    subquery: subquery.result.sql,
    aggregationFn,
  });
};

/**
 * @description Used to normalize processing of simple and complex resources. if complex, the first resource is used as the interface, which is the result of the middleware that aggregates or otherwise modifies the subquery data structure.
 * @param {string} str
 * @param {string} [seperator=":"]
 */
export const getFirstIfSeperated = (str: string, seperator = ":") =>
  str.includes(seperator) ? str.split(seperator)[0] : str;

/**
 * @description Seemingly reducer that takes Object.entries and generates Object. Could probably be done with Object.fromEntries -- but the value here is likely typescript (IClassResourceMap). Could likely be culled with a small Pull Request
 * @param {*} Resources
 * @returns {ts.IClassResourceMap}
 */
export const genResourcesMap = (Resources): ts.IClassResourceMap =>
  Resources.reduce(
    (batch, [name, _Resource]: any) => ({
      ...batch,
      [name]: _Resource,
    }),
    {}
  );

/**
 * @description used to namespace complex resources from natural ones. fn name needs attention.
 * @param {*} str
 */
export const transformNameforResolver = (str) =>
  str
    .split(":")
    .map((item) => pascalCase(item)) // this is done to prevent collisions with db resources
    .join(cnst.COMPLEX_RESOLVER_SEPERATOR);

/**
 * @description Transform WKT strings to GeoJSON
 * @param {*} wktString
 */
export const wktToGeoJSON = (wktString) =>
  wktString
    ? wkx.Geometry.parse(Buffer.from(wktString, "hex")).toGeoJSON()
    : null;

/**
 * @description GraphQL calls naturally feature `fields`, however we must distinguish between meta keys and nested db fields. This supports that utility.
 * @param {*} information
 * @returns
 */
export const extractSelectedFields = (information: any) => {
  let props = []; // top level fields from GraphQL Type
  let fields = []; // fields within `data` GraphQL Type

  const _filter = (name?: string) => (item) =>
    !name
      ? item.kind && item.name
      : item.kind && item.name && item.name.value === name;

  const requestedFields = (item) => item.name.value;
  const _reduce = (accum, item) =>
    item.selectionSet &&
    item.selectionSet.selections &&
    item.selectionSet.selections.length
      ? [...accum, ...item.selectionSet.selections.map(requestedFields)]
      : accum;

  information.fieldNodes.forEach((fieldNode) => {
    if (fieldNode.selectionSet && fieldNode.selectionSet.selections) {
      const _props = fieldNode.selectionSet.selections
        .filter(_filter())
        .map(requestedFields);

      const _fields = fieldNode.selectionSet.selections
        .filter(_filter("data"))
        .reduce(_reduce, []);
      fields = [...fields, ..._fields];
      props = [...props, ..._props];
    }
  });

  return { props, fields };
};

/**
 * @description Adds postProcessResponse fn for db dialects where knex returns TextRow objects
 * @param {*} knexConfig
 */
export const initPostProcessing = (knexConfig) =>
  !knexConfig.client.includes("mysql")
    ? knexConfig
    : {
        postProcessResponse: (result, queryContext) => {
          // only do this for mysql2
          return Array.isArray(result) &&
            result.length &&
            result[0].constructor.name === "Array"
            ? result[0] // should be TextRow
            : result;
        },
        ...knexConfig,
      };

/**
 * @description checks against whitelist to see if db named supports return on DML
 * @param {string} client
 */
export const supportsReturnOnCreateAndUpdate = (client: string) =>
  ["pg", "mssql", "oracledb"].includes(client);

// tslint:disable: no-bitwise
/**
 * @description
 * @returns {ts.IServicePermission}
 */
export const permit = (): ts.IServicePermission => ({
  _permission: 0,
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  create() {
    this._permission = this._permission | cnst.PERMIT_CREATE;
    return this;
  },
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  read() {
    this._permission = this._permission | cnst.PERMIT_READ;
    return this;
  },
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  update() {
    this._permission = this._permission | cnst.PERMIT_UPDATE;
    return this;
  },
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  delete() {
    this._permission = this._permission | cnst.PERMIT_DELETE;
    return this;
  },
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  crud() {
    return this.create().read().update().delete();
  },
  /**
   * @description
   * @returns {ts.IServicePermission}
   */
  none() {
    this._permission = 0;
    return this;
  },
  /**
   * @description
   * @returns {number}
   */
  get() {
    return this._permission;
  },
});

/**
 * @description Transform dot notation for schema.table to schema_table.
 * @param {*} str
 * @returns {string}
 */
const prepCase = (str): string => str.split(".").join("_");
// NOTE: be sure to change key case to match `db_resources`

/**
 * @description Transforms permission object into bitwise flags
 * @param {ts.IObjectStringByGeneric<ts.IServicePermission>} permissions
 * @returns {ts.IObjectStringByNumber}
 */
export const extractPermissions = (
  permissions: ts.IObjectStringByGeneric<ts.IServicePermission>
): ts.IObjectStringByNumber =>
  Object.fromEntries(
    Object.entries(permissions).map(([key, value]) => [
      prepCase(key),
      value.get(),
    ])
  );

/**
 * @description String to Ints for BitWise operations (permission flags)
 * @param {string} operation
 * @returns
 */
export const operationFlag = (operation: string) => {
  switch (operation) {
    case "create":
      return cnst.PERMIT_CREATE;
    case "read":
    case "search":
      return cnst.PERMIT_READ;
    case "update":
      return cnst.PERMIT_UPDATE;
    case "delete":
      return cnst.PERMIT_DELETE;
  }
  return 0;
};

// | because we are applying fine grain to higher policy
// TODO: the application of sysPerms and resourcePerms is wrong. Fix before release
/**
 * @description Used to determine if a given method is permitted on a resource.
 * @param {ts.IConfigServicePermission} permissions
 */
export const permitted = (permissions: ts.IConfigServicePermission) => (
  resource: string,
  operation: string
) =>
  !!(
    operationFlag(operation) &
      (permissions.systemPermissions |
        permissions.resourcePermissions[resource]) ||
    operationFlag(operation) & permissions.resourcePermissions[resource]
  );

/**
 * @description Transforms nested object from REST, GraphQL, gRPC to simply entries. Used in validation and query building.
 * @param {string} sep
 */
export const stringValues = (sep: string) => (obj: object) =>
  Object.fromEntries(
    Object.entries(obj || {}).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.join(sep || cnst.SEARCH_QUERY_CONTEXT.seperator)
        : value,
    ])
  );

/**
 * @description adds message field index numbers to protobuff messages
 * @param {*} el
 * @param {*} i
 */
export const appendIndex = (el, i) => `${el} = ${++i}`;
/**
 * @description appends semicolon to given string
 * @param {*} el
 */
export const appendSemicolon = (el) => `${el};`;

// https://github.com/mesg-foundation/mesg-js/blob/238e70e56cc8a35cfc8ffeb1ffa92c3160ff5d87/src/util/encoder.ts

/**
 * @description Transforms values in js object to protobuff struct scalars
 * @param {*} data
 * @param {*} key
 * @returns
 */
export const encodeStructField = (data, key) => {
  const value = data[key];
  switch (Object.prototype.toString.call(value)) {
    case "[object Null]":
    case "[object Undefined]":
      return { nullValue: value };
    case "[object Object]":
      return {
        structValue: {
          fields: encodeStructFields(value),
        },
      };
    case "[object Array]":
      return {
        listValue: {
          values: value.map((k, i) => encodeStructField(value, i)),
        },
      };
    case "[object Number]":
      return { numberValue: value };
    case "[object Boolean]":
      return { boolValue: value };
    case "[object String]":
      return { stringValue: value };
    case "[object Date]":
      return { stringValue: (value as Date).toJSON() };
    default:
      throw new Error("not supported");
  }
};

/**
 * @description Transforms entries in js object to protobuff struct scalars
 * @param {*} data
 */
export const encodeStructFields = (data) =>
  Object.keys(data).reduce(
    (prev, next) => ({
      ...prev,
      [next]: encodeStructField(data, next),
    }),
    {}
  );

/**
 * @description Transforms js object to protobuff struct
 * @param {{ [key: string]: any }} data
 * @returns
 */
export const encodeStruct = (data: { [key: string]: any }) => {
  return {
    fields: data ? encodeStructFields(data) : data,
  };
};

// the functions below only exist for implementation within `service-engine-docker`
// it is used in the custom migration feature

/**
 * @description generates migration script name needed for reading from sql & up/down directories
 * @param {*} {date, id, args}
 * @returns
 */
export const genNextMigrationName = ({ date, id, args }) => {
  const timestamp = date
    .toISOString()
    .replace(cnst.REGEX_NON_DIGIT, "")
    .substr(0, 14);
  const name = snakeCase(
    args.length ? args.join("-") : cnst.DEFAULT_MIGRATION_SCRIPT_NAME
  );
  return [timestamp, id, name].join("_");
};

/**
 * @description List all files in a directory in Node.js recursively in a synchronous fashion (taken from a gist)
 * @param {*} dir
 * @param {*} filelist
 * @returns
 */
export const surveyDirectory = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = surveyDirectory(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

/**
 * @description seperate files into up & down batches for knex
 * @param {*} accum
 * @param {*} curr
 * @returns
 */
export const reducerSqlContent = (accum, curr) => {
  const direction = curr.includes("/up/") ? "up" : "down";
  accum[direction].push(curr);
  return accum;
};

/**
 * @description collects and sorts filenames for all content that make up a migration batch
 * @param {*} dir
 * @param {*} id
 * @returns
 */
export const gatherModularSQLContentByID = (dir, id) => {
  const source = surveyDirectory(
    [dir, "sql", id].join("/")
  ).reduce(reducerSqlContent, { up: [], down: [] });
  source.up.sort();
  source.down.sort();
  return source;
};

/**
 * @description generic knex up/down fns that intake file paths and process the content via knex.raw(file_content)
 * @param {*} files
 */
export const processModularSQL = (files) => (knex) =>
  !files.length
    ? knex
    : files.reduce(
        (tnx, file) => tnx.raw(fs.readFileSync(file, "utf-8")),
        knex.schema
      );

/**
 * @description convenience fn that minimizes implementation code for utilizing these methods. Implemented in custom knex stub
 * @param {*} dirname
 * @param {*} filename
 * @returns
 */
export const modularMigration = (dirname, filename) => {
  const id = filename.replace(dirname, "").split("_")[1];
  const { up, down } = gatherModularSQLContentByID(dirname, id);
  return {
    up: processModularSQL(up),
    down: processModularSQL(down),
  };
};
