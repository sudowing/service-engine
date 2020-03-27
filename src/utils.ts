import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import { SUPPORTED_OPERATIONS, UNDERSCORE_IDS, UNDERSCORE_BYKEY, DOT, DEFINED_ARG_LENGTHS,
  STRING,
  NUMBER,
  BOOLEAN,
  EQUAL,
  QUOTED_VALUE,

} from "./const";
import * as ts from "./interfaces";

const typecastFn = (type: string):
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ts.IDefaultTypeCast => {
  switch (type) {
    case STRING:
      return String;
    case NUMBER:
      return Number;
    case BOOLEAN:
      return Boolean;
    default:
      return (arg) => arg;
  }
};

const modifyValidator = (validator: Joi.Schema): Joi.Schema => {
  const weakValidator = cloneDeep(validator);
  cloneDeep(validator)[UNDERSCORE_IDS][UNDERSCORE_BYKEY].forEach(
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
    // need to also eval geoqueries
    type: schema.type,
    required: !!(schema._flags && schema._flags.presence),
    typecast: typecastFn(schema.type),
    // validate: (value: string) => schema.validateAsync((typecastFn(schema.type) as any)(value))
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
    validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].values()
  ) as any).reduce(reducerValidatorInspector, {});

const error_message_invalid_value = (error: Error, field: string) => error.message.replace(QUOTED_VALUE, `'${field}'`)

const searchQueryParser = (validator: Joi.Schema, query: ts.IParamsSearchQueryParser) => {
  const errors = [];
  const components = [];
  Object.entries(query).forEach(([key, rawValue]) => {
    const [field, op] = key.split(DOT);
    const operation = op ? op : EQUAL;
    const { schema } = validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {};
    const record = {field, rawValue, operation, type};
    const typecast: any = typecastFn(type);

    let valid: any = {};
    
    // need to handle comma seperated multi values in `in` & etc
    if (SUPPORTED_OPERATIONS[operation]) {
      const values = rawValue.split(',').map(typecast)

      // report error if operation has wrong arg length
      if (DEFINED_ARG_LENGTHS[operation] && DEFINED_ARG_LENGTHS[operation] !== values.length) {
        errors.push({ field, error: `'${operation}' operation requires ${DEFINED_ARG_LENGTHS[operation]} args. ${values.length} were provided.` });
      }

      const wip = schema ? values.map(value => schema.validate(value)) : [];
      const error = wip.reduce((accum, {error}, i) => [...accum, ...( error ? [
        error.message.replace(QUOTED_VALUE, `'${field}' argument #${i}`)
      ] : [])], []).join(',');

      if (error) errors.push({ field, error });
      components.push({ ...record, value: values });
    }
    else {
      valid = schema ? schema.validate(typecast(rawValue)) : {}

      const { value, error } = valid;

      // unsupported record fields && sql operations need to go to errors
      if (error || !type || !SUPPORTED_OPERATIONS.hasOwnProperty(operation)) {
        errors.push({
          field,
          error: error ? error_message_invalid_value(error, field) :
            !type ? `'${field}' is not a supported property on this resource` :
              `'${operation}' operation not supported`
        });
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
  searchQueryParser
};
