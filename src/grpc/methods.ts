import { v4 as uuidv4 } from "uuid";

import { NON_RETURNING_SUCCESS_RESPONSE } from "../const";
import { genCountQuery } from "../database";
import { IServiceResolverResponseBase, IClassResourceMap } from "../interfaces";
import {
  contextTransformer,
  callComplexResource,
  transformNameforResolver,
  permitted,
  genResourcesMap,
  getFirstIfSeperated,
} from "../utils";

import { encodeStruct } from "../utils";

const apiType = "GRPC";

  // TODO: if this works for grpc -- expport from GRAPHQL module and use here and there
  const parseGraphQLInput = (field, op, value) => {
    if (op === "geo") {
      const [_op, ..._field] = field.split("_");
      const _value =
        _op === "polygon"
          ? [value]
          : _op === "radius"
          ? [value.long, value.lat, value.meters]
          : [value.xMin, value.yMin, value.xMax, value.yMax];
      return [`${_field}.geo_${_op}`, _value];
    } else if (["not_range", "range"].includes(op)) {
      return [`${field}.${op}`, [value.min, value.max]];
    } else if (["not_in", "in"].includes(op)) {
      return [`${field}.${op}`, value];
    }

    return [`${field}.${op}`, value];
  };

  // TODO: this is copy/paste from the resolvers module. need to unite
  const gqlParsePayload = (obj: object) =>
    Object.fromEntries(
      Object.entries(obj).flatMap(([op, values]) =>
        Object.entries(values).map(([field, value]) =>
          parseGraphQLInput(field, op, value)
        )
      )
    );
const DEFAULT_INPUT = () => ({ payload: {}, context: {}, options: {}, subquery: {} });


export const grpcMethodGenerator = (resourcesMap: IClassResourceMap) => (
  resource,
  hardDelete: boolean
) => (operation: string) => async ({ request: args }, callback) => {
  const reqId = uuidv4();

  const report = resource.report[operation];
  const resource_fields = Object.keys(report);

  console.log('resource_fields')
  console.log(resource_fields)


  const singleRecord = ["read", "update"].includes(operation); // used to id if response needs to pluck first item in array
  const argKeys = ["read", "delete"].includes(operation); // used to id if response needs to pluck first item in array


  const input = argKeys || operation === 'create'
    ? { ...DEFAULT_INPUT(), payload: args }
    : { ...DEFAULT_INPUT(), ...args };

  console.log('input')
  console.log(input)

  const { payload, context, options, keys, subquery } = input;





  context.fields = context.fields ? contextTransformer("fields", context.fields) : resource_fields



  
  if (!resource.supportsReturn && ["create", "update"].includes(operation)) {
    context.fields = [];
  }

  if (context.orderBy) {
    context.orderBy = contextTransformer("orderBy", context.orderBy);
  }
  const query = {
    payload:
      operation === "update"
        ? { ...payload, ...keys }
        : operation === "search"
        ? gqlParsePayload(payload)
        : payload,
    context,
    requestId: reqId,
    apiType,
    hardDelete,
  };

  console.log('operation, query')
  console.log(operation, query)

  const subPayload = {
    ...subquery, // subquery has `payload` & `context` keys. needs to be typed
    requestId: reqId,
    apiType,
  };

  const _serviceResponse = resource.hasSubquery
    ? callComplexResource(
        resourcesMap,
        resource.name,
        operation,
        query,
        subPayload
      )
    : resource[operation](query);

  const serviceResponse = await _serviceResponse;
  console.log('serviceResponse')
  console.log(serviceResponse)
  if (serviceResponse.result) {

    try {
      const _records = await serviceResponse.result.sql;

      console.log('_records')
      console.log(_records)
    

      const data =
        !resource.supportsReturn && ["create", "update"].includes(operation)
          ? operation === "update"
            ? [NON_RETURNING_SUCCESS_RESPONSE]
            : NON_RETURNING_SUCCESS_RESPONSE
          : resource.transformRecords(_records);

      // TODO: add error logging and `dbCallSuccessful` type flag (like in routers) to prevent count if db call failed

      // update & delete will one day support search query for bulk mutation (already supported in the class I think)

      delete serviceResponse.result.sql;

      // send count as additional field
      const response: IServiceResolverResponseBase = {
        data: singleRecord ? (data.length ? data[0] : null) : data,
      };

      console.log('response')
      console.log(response)

      if (operation === "search" && options.count) {
        // later could apply to update & delete

        const { seperator, notWhere, statementContext } = query.context;
        query.context = { seperator, notWhere, statementContext };

        const _searchCountResult = resource.hasSubquery
          ? callComplexResource(
              resourcesMap,
              resource.name,
              operation,
              query,
              subPayload
            )
          : resource[operation](query);

        const { result: searchCountResult } = await _searchCountResult; // validation is now async!

        const sqlSearchCount = genCountQuery(
          resource.db,
          searchCountResult.sql
        );

        const [{ count }] = await sqlSearchCount; // can/should maybe log this

        response.count = count;
      }

      const transformJson = (record) => {

        console.log('transformJson: report')
        console.log(report)
        console.log('transformJson: record')
        console.log(record)


        const jsonFields = Object.keys(record).filter(
          (key) => !!report[key].geoqueryType
        );
        for (const jsonField of jsonFields) {
          record[jsonField] = encodeStruct(record[jsonField]);
        }
        return {
          ...record,
        };
      };

      const jsonToStructs = ({data: _data, ...other}) => {
        let output = {..._data, ...other};
        if (_data) {
          output = {
            ...other,
            data: Array.isArray(_data) ? _data.map(transformJson) : transformJson(_data),
          };
        }

        return output;
      };
      console.log('response')
      console.log(response)
      let final;

      if (operation === 'delete') {
        final = {number: response.data}
      }
      else if (singleRecord) {
        final = transformJson(response.data)
      }
      else {
        // need to check create one-and-many
        final = jsonToStructs(response).data[0]
      }

      console.log('final')
      console.log(final)
      
      callback(null, final);

      // if single record searched and not returned -- 404
      // if ([null, undefined].includes(output)) {
    } catch (err) {

      console.log('err')
      console.log(err)

      // log error && // not a user input error
      callback(
        new Error(
          {
            message: "cnst.INTERNAL_SERVER_ERROR",
            detail: serviceResponse,
            reqId,
          }.toString()
        )
      );
    }
  } else {
    callback(
      new Error(
        {
          message: "HTTP_STATUS.BAD_REQUEST",
          detail: serviceResponse,
          reqId,
        }.toString()
      )
    );
  }
};

export const grpcMethodFactory = ({
  Resources,
  dbResources,
  hardDelete,
  permissions,
}) => {
  // export const grpcMethodGenerator = (resourcesMap: IClassResourceMap, logger) => (
  //     resource,
  //     hardDelete: boolean,
  //     supportsReturn: boolean
  //   ) => (operation: string) => async (args, callback) => {

  const grpcMethods = Resources.reduce((methods, [name, resource]) => {
    const allow = permitted(permissions);
    const permit = {
      create: allow(name, "create"),
      read: allow(name, "read"),
      update: allow(name, "update"),
      delete: allow(name, "delete"),
      any: true,
    };
    permit.any = permit.create || permit.read || permit.update || permit.delete;

    const ResourceName = transformNameforResolver(name);
    const resourcesMap = genResourcesMap(Resources);

    const resolver = grpcMethodGenerator(resourcesMap)(resource, hardDelete);

    const output = {
      ...methods,
      [`Read${ResourceName}`]: resolver("read"),
      [`Search${ResourceName}`]: resolver("search"),
      [`Create${ResourceName}`]: resolver("create"),
      [`Update${ResourceName}`]: resolver("update"),
      [`Delete${ResourceName}`]: resolver("delete"),
    };

    const keys = Object.values(dbResources[getFirstIfSeperated(name)]).filter(
      (item: any) => item.primarykey
    );

    // if resource lacks keys -- delete resolvers for unique records
    if (!keys.length) {
      delete output[`Read${ResourceName}`];
      delete output[`Update${ResourceName}`];
      delete output[`Delete${ResourceName}`];
    } else {
      if (!permit.read) {
        delete output[`Read${ResourceName}`];
      }
      if (!permit.update) {
        delete output[`Update${ResourceName}`];
      }
      if (!permit.delete) {
        delete output[`Delete${ResourceName}`];
      }
    }
    if (!permit.create) {
      delete output[`Create${ResourceName}`];
    }
    if (!permit.read) {
      delete output[`Search${ResourceName}`];
    }
    return output;
  }, {});

  return grpcMethods;
};
