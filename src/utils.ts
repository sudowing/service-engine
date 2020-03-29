import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import * as cnst from "./const";
import * as ts from "./interfaces";

const typecastFn = (type: string):
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ts.IDefaultTypeCast
  | any => {
  switch (type) {
    case cnst.STRING:
      return String;
    case cnst.NUMBER:
      return Number;
    case cnst.BOOLEAN:
      return (arg) => Boolean((cnst.FALSEY_STRING_VALUES.includes(arg) ? false : arg));
    default:
      return (arg) => arg;
  }
};

const modifyValidator = (validator: Joi.Schema): Joi.Schema => {
  const weakValidator = cloneDeep(validator);
  weakValidator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].forEach(
    ({ schema: { _flags } }) => {
      if (_flags && _flags.presence) delete _flags.presence;
    }
  );
  return weakValidator;
};


const reducerValidatorInspector = (
  accum: object,
  { id, schema }
): ts.IValidatorInspectorReport => ({
    ...accum,
    [id]: {
      type: schema.type,
      required: !!(schema._flags && schema._flags.presence),
      geoqueryType: schema._invalids && schema._invalids.has(cnst.SYMBOL_GEOQUERY)
        ? (schema._invalids.has(cnst.SYMBOL_GEOQUERY_POINT) ? 'point' : 'polygon')
        : null,
      softDeleteFlag: !!(schema._invalids && schema._invalids.has(cnst.SYMBOL_SOFT_DELETE)),
      typecast: typecastFn(schema.type), // prob need dynamaic assignment for geo fields (need input as numbers and strings?)
      validate: (value: string) => schema.validate((typecastFn(schema.type) as any)(value))
    },
});

/**
 * @description Used for swagger generation and for validating user queries. Real validator cannot be used as those are plain objects and may need to validate field multiple times (sql where field <= 5 and >= 12) <-- need to validate values against field twice.
 * @param {Joi.Schema} validator
 * @returns {ts.IValidatorInspectorReport}
 */
const validatorInspector = (
  validator: Joi.Schema
): ts.IValidatorInspectorReport =>
  (Array.from(
    validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].values()
  ) as any).reduce(reducerValidatorInspector, {});

const error_message_invalid_value = (error: Error, field: string) =>
  error.message.replace(cnst.QUOTED_VALUE, `'${field}'`)

const generateSearchQueryError = ({error, field, type, operation}) =>
  error ? error_message_invalid_value(error, field) :
    !type ? `'${field}' is not a supported property on this resource` :
      `'${operation}' operation not supported`
const badArgsLengthError = (operation: string, values: any[]) =>
`'${operation}' operation requires ${cnst.DEFINED_ARG_LENGTHS[operation]} args. ${values.length} were provided.`

const concatErrorMessages = (field: string) =>
  (accum, {error}, i) =>
    [...accum, ...(
      error ? [error.message.replace(cnst.QUOTED_VALUE, `'${field}' argument #${i}`)] : []
    )];

const validArgsforOperation = (operation: string, values: any[]) =>
  cnst.DEFINED_ARG_LENGTHS[operation] ? cnst.DEFINED_ARG_LENGTHS[operation] === values.length : true;
const supportMultipleValues = (operation: string) => cnst.SUPPORTED_OPERATIONS[operation];
const supportedOperation = (operation: string) => cnst.SUPPORTED_OPERATIONS.hasOwnProperty(operation);

const parseFieldAndOperation = (key: string) => {
  const [field, op] = key.split(cnst.DOT);
  return { field, operation: op ? op : cnst.EQUAL }
};

const searchQueryParser = (validator: Joi.Schema, query: ts.IParamsSearchQueryParser) => {
  const errors = [];
  const components = [];
  Object.entries(query).forEach(([key, rawValue]) => {
    const { field, operation } = parseFieldAndOperation(key);
    const { schema } = validator[cnst.UNDERSCORE_IDS][cnst.UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {}; // all fields have types. if undefined -- simply not a field on the resource
    const record = {field, rawValue, operation, type};
    const typecast: any = typecastFn(type);
    if (supportMultipleValues(operation)) {
      const values = rawValue.split(cnst.COMMA).map(typecast)
      if  (!validArgsforOperation(operation, values)) errors.push({ field, error: badArgsLengthError(operation, values) });
      const validatedValues = schema ? values.map(value => schema.validate(value)) : [];
      const error = validatedValues.reduce(concatErrorMessages(field), []).join(cnst.COMMA);
      if (error) errors.push({ field, error });
      components.push({ ...record, value: values });
    }
    else {
      const { value, error } = schema ? schema.validate(typecast(rawValue)) : ({} as any)
      if (error || !type || !supportedOperation(operation)) {
        errors.push({ field, error: generateSearchQueryError({error, field, type, operation}) });
      }
      components.push({ ...record, value });
    }
  });
  return {errors, components}
}

export {
  typecastFn,
  validatorInspector,
  modifyValidator,
  reducerValidatorInspector,
  searchQueryParser,
};