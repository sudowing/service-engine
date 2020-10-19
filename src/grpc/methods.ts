
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
} from "../utils";

const apiType = "GRPC";
export const grpcMethodGenerator = (resourcesMap: IClassResourceMap) => (
  resource,
  hardDelete: boolean,
) => (operation: string) => async (args, callback) => {

  const reqId = uuidv4();

  const defaultInput = { payload: {}, context: {}, options: {}, subquery: {} };

  const input = { ...defaultInput, ...args };
  const { payload, context, options, keys, subquery } = input;

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

  const gqlParsePayload = (i: object) =>
    Object.fromEntries(
      Object.entries(i).flatMap(([op, values]) =>
        Object.entries(values).map(([field, value]) =>
          parseGraphQLInput(field, op, value)
        )
      )
    );

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

  if (serviceResponse.result) {

    try {
      const _records = await serviceResponse.result.sql;
      const data =
        !supportsReturn && ["create", "update"].includes(operation)
          ? operation === "update"
            ? [NON_RETURNING_SUCCESS_RESPONSE]
            : NON_RETURNING_SUCCESS_RESPONSE
          : resource.transformRecords(_records);

      // TODO: add error logging and `dbCallSuccessful` type flag (like in routers) to prevent count if db call failed

      // update & delete will one day support search query for bulk mutation (already supported in the class I think)
      const singleRecord = ["read", "update"].includes(operation); // used to id if response needs to pluck first item in array

      delete serviceResponse.result.sql;


      if (subquery) {
        // @ts-ignore
        debug.input.subPayload = subPayload;
      }

      // send count as additional field
      const response: IServiceResolverResponseBase = {
        data: singleRecord ? (data.length ? data[0] : null) : data,
      };

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

      callback(null, response);

      // if single record searched and not returned -- 404
      // if ([null, undefined].includes(output)) {

    } catch (err) {
      // log error && // not a user input error
      callback(new Error({
            message: "cnst.INTERNAL_SERVER_ERROR",
            detail: serviceResponse,
            reqId,
      }.toString()));
    }
  } else {
    callback(new Error({
        message: "HTTP_STATUS.BAD_REQUEST",
        detail: serviceResponse,
        reqId,
    }.toString()));
  }
};



export const grpcMethodFactory = ({
    Resources,
    permissions,
}) => {

    // export const grpcMethodGenerator = (resourcesMap: IClassResourceMap, logger) => (
    //     resource,
    //     hardDelete: boolean,
    //     supportsReturn: boolean
    //   ) => (operation: string) => async (args, callback) => {



























    const grpcMethods = Resources
    .reduce(
      (methods, [name, resource]) => {
        const allow = permitted(permissions);
        const permit = {
          create: allow(name, "create"),
          read: allow(name, "read"),
          update: allow(name, "update"),
          delete: allow(name, "delete"),
          any: true,
        };
        permit.any =
          permit.create || permit.read || permit.update || permit.delete;

        const ResourceName = transformNameforResolver(name);
        const resourcesMap = genResourcesMap(Resources);

        const resolver = makeServiceResolver(resourcesMap)(
          resource,
          hardDelete,
          resource.supportsReturn
        );

        const output = {
            ...methods,
            [`Read${ResourceName}`]: resolver("read"),
            [`Search${ResourceName}`]: resolver("search"),
            [`Create${ResourceName}`]: resolver("create"),
            [`Update${ResourceName}`]: resolver("update"),
            [`Delete${ResourceName}`]: resolver("delete"),
        };

        const keys = Object.values(
          dbResources[getFirstIfSeperated(name)]
        ).filter((item: any) => item.primarykey);

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
      },
      {}
    );

    return grpcMethods;
}



