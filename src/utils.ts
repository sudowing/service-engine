import * as Joi from "@hapi/joi";
import { cloneDeep } from "lodash";
import { SUPPORTED_OPERATIONS, UNDERSCORE_IDS, UNDERSCORE_BYKEY, DOT, DEFINED_ARG_LENGTHS,
  STRING,
  NUMBER,
  BOOLEAN,
  EQUAL,
  QUOTED_VALUE,
  COMMA,

} from "./const";
import * as ts from "./interfaces";

const symbolGeoquery = Symbol('geoquery');
const symbolGeoqueryPoint = Symbol('geoquery-point');
const symbolGeoqueryPolygon = Symbol('geoquery-polygon');
const symbolSoftDelete = Symbol('soft_delete');

const falsey = ['','f','false', '0'];

const typecastFn = (type: string):
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ts.IDefaultTypeCast
  | any => {
  switch (type) {
    case STRING:
      return String;
    case NUMBER:
      return Number;
    case BOOLEAN:
      return (arg) => Boolean((falsey.includes(arg) ? false : arg));
    default:
      return (arg) => arg;
  }
};

const modifyValidator = (validator: Joi.Schema): Joi.Schema => {
  const weakValidator = cloneDeep(validator);
  weakValidator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].forEach(
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
      geoquery: schema._invalids && schema._invalids.has(symbolGeoquery)
        ? (schema._invalids.has(symbolGeoqueryPoint) ? 'point' : 'polygon')
        : null
      ,
      softDeleteFlag: !!(schema._invalids && schema._invalids.has(symbolSoftDelete)),
      typecast: typecastFn(schema.type), // prob need dynamaic assignment for geo fields (need input as numbers and strings?)
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

const error_message_invalid_value = (error: Error, field: string) =>
  error.message.replace(QUOTED_VALUE, `'${field}'`)

const generateSearchQueryError = ({error, field, type, operation}) =>
  error ? error_message_invalid_value(error, field) :
    !type ? `'${field}' is not a supported property on this resource` :
      `'${operation}' operation not supported`
const badArgsLengthError = (operation: string, values: any[]) =>
`'${operation}' operation requires ${DEFINED_ARG_LENGTHS[operation]} args. ${values.length} were provided.`

const concatErrorMessages = (field: string) => (accum, {error}, i) => [...accum, ...( error ? [
  error.message.replace(QUOTED_VALUE, `'${field}' argument #${i}`)
] : [])]


const validArgsforOperation = (operation: string, values: any[]) =>
  DEFINED_ARG_LENGTHS[operation] ? DEFINED_ARG_LENGTHS[operation] === values.length : true;
const supportMultipleValues = (operation: string) => SUPPORTED_OPERATIONS[operation];
const supportedOperation = (operation: string) => SUPPORTED_OPERATIONS.hasOwnProperty(operation);

const parseFieldAndOperation = (key: string) => {
  const [field, op] = key.split(DOT);
  return { field, operation: op ? op : EQUAL }
};

const searchQueryParser = (validator: Joi.Schema, query: ts.IParamsSearchQueryParser) => {
  const errors = [];
  const components = [];
  Object.entries(query).forEach(([key, rawValue]) => {
    const { field, operation } = parseFieldAndOperation(key);
    const { schema } = validator[UNDERSCORE_IDS][UNDERSCORE_BYKEY].get(field) || {};
    const { type } = schema || {}; // all fields have types. if undefined -- simply not a field on the resource
    const record = {field, rawValue, operation, type};
    const typecast: any = typecastFn(type);
    if (supportMultipleValues(operation)) {
      const values = rawValue.split(COMMA).map(typecast)
      if  (!validArgsforOperation(operation, values)) errors.push({ field, error: badArgsLengthError(operation, values) });
      const validatedValues = schema ? values.map(value => schema.validate(value)) : [];
      const error = validatedValues.reduce(concatErrorMessages(field), []).join(COMMA);
      if (error) errors.push({ field, error });
      components.push({ ...record, value: values });
    }
    else {
      const { value, error } = schema ? schema.validate(typecast(rawValue)) : ({} as any)
      if (error || !type || !supportedOperation(operation)) {

        console.log('**********');
        console.log('oooo.error');
        console.log(error);
        console.log('oooo.zzzzz');
        console.log(field, type, operation);
        console.log('**********');

        errors.push({ field, error: generateSearchQueryError({error, field, type, operation}) });
      }
      components.push({ ...record, value });
    }
  });

  return {errors, components}

}


const JOI_GEOFIELD_POINT = Joi.number().invalid(symbolGeoquery, symbolGeoqueryPoint);
const JOI_GEOFIELD_POLYGON = Joi.number().invalid(symbolGeoquery, symbolGeoqueryPolygon);
const JOI_SOFT_DELETE_FLAG = Joi.boolean().invalid(symbolSoftDelete);

export {
  typecastFn,
  validatorInspector,
  modifyValidator,
  reducerValidatorInspector,
  searchQueryParser,
  symbolGeoquery,
  JOI_GEOFIELD_POINT,
  JOI_GEOFIELD_POLYGON,
  JOI_SOFT_DELETE_FLAG,
  symbolGeoqueryPoint,
  symbolGeoqueryPolygon,
};


// need to confirm usage of GEOFIELD validator type
// was it used for points or polygons?
// I know it was used geojson generation on out/publish
// I think the gis functions were only done on points!
// will need two seperate validation types (number and string) to handle various inputs -- else dynamic typecast fn assignment