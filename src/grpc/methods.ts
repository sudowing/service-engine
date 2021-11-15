import { v4 as uuidv4 } from "uuid";

import {
  NON_RETURNING_SUCCESS_RESPONSE,
  NON_RETURNING_FAILURE_RESPONSE,
  UNIQUE_RECORD_NOT_FOUND_WITH_KEYS,
} from "../const";
import { genCountQuery } from "../database";
import { IServiceResolverResponseBase, IClassResourceMap } from "../interfaces";
import {
  contextTransformer,
  callComplexResource,
  transformNameforResolver,
  permitted,
  genResourcesMap,
  getFirstIfSeperated,
  gqlParsePayload,
} from "../utils";

import { encodeStruct } from "../utils";

const nonReturningResponse = (val: any) =>
  !!val ? NON_RETURNING_SUCCESS_RESPONSE : NON_RETURNING_FAILURE_RESPONSE;

const apiType = "GRPC";

const DEFAULT_INPUT = () => ({
  payload: {},
  context: {},
  options: {},
  subquery: {},
});

export const grpcMethodGenerator =
  (resourcesMap: IClassResourceMap) =>
  (resource, hardDelete: boolean) =>
  (operation: string) =>
  async ({ request: args }, callback) => {
    const reqId = uuidv4();

    const report = resource.report[operation];
    const resourceFields = Object.keys(report);

    const singleRecord = ["read", "update"].includes(operation); // used to id if response needs to pluck first item in array
    const argKeys = ["read", "delete"].includes(operation); // used to id if response needs to pluck first item in array

    const input = argKeys
      ? { ...DEFAULT_INPUT(), payload: args }
      : { ...DEFAULT_INPUT(), ...args };

    const { payload, context, options, keys, subquery } = input;

    context.fields = context.fields
      ? contextTransformer("fields", context.fields)
      : resourceFields;

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
      payload: gqlParsePayload(subquery), // subquery has `payload` & `context` keys. needs to be typed
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
          !resource.supportsReturn && ["create", "update"].includes(operation)
            ? operation === "update"
              ? [nonReturningResponse(_records)]
              : nonReturningResponse(_records)
            : resource.transformRecords(_records);

        // TODO: add error logging and `dbCallSuccessful` type flag (like in routers) to prevent count if db call failed

        // update & delete will one day support search query for bulk mutation (already supported in the class I think)

        delete serviceResponse.result.sql;

        // send count as additional field
        const response: IServiceResolverResponseBase = {
          data: singleRecord ? (data.length ? data[0] : null) : data,
        };

        if (operation === "search" && options.count) {
          // later could apply to update & delete

          const { seperator, notWhere, statementContext, distinct, fields } =
            query.context;
          query.context = {
            seperator,
            notWhere,
            statementContext,
            distinct,
            fields,
          };

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
          const jsonFields = Object.keys(record).filter(
            (key) =>
              !!(
                report[key] &&
                (report[key].geoqueryType || report[key].jsonType)
              )
          );
          for (const jsonField of jsonFields) {
            record[jsonField] = encodeStruct(record[jsonField]);
          }
          return {
            ...record,
          };
        };

        const jsonToStructs = ({ data: _data, ...other }) => {
          let output = { ..._data, ...other };
          if (_data) {
            output = {
              ...other,
              data: Array.isArray(_data)
                ? _data.map(transformJson)
                : transformJson(_data),
            };
          }

          return output;
        };

        let final;

        if (
          !resource.supportsReturn &&
          ["create", "update"].includes(operation)
        ) {
          final = response.data;
        } else if (operation === "delete") {
          final = { number: response.data };
        } else if (operation === "read") {
          if (!response.data) {
            throw new Error(UNIQUE_RECORD_NOT_FOUND_WITH_KEYS);
          }
          final = transformJson(response.data);
        } else if (operation === "update") {
          final = transformJson(response.data);
        } else if (operation === "create") {
          // need to check create one-and-many
          final = Array.isArray(response.data)
            ? { data: response.data.map(transformJson) }
            : jsonToStructs(response).data[0];
        } else if (operation === "search") {
          // need to check create one-and-many
          final = { ...response, data: response.data.map(transformJson) };
        }

        callback(null, final);

        // if single record searched and not returned -- 404
        // if ([null, undefined].includes(output)) {
      } catch (err) {
        const message =
          err.message === UNIQUE_RECORD_NOT_FOUND_WITH_KEYS
            ? "BAD_REQUEST"
            : "INTERNAL_SERVER_ERROR";

        resource.logger.error(
          {
            message,
            reqId,
            err,
            detail: err.message,
          },
          "grpc method call error"
        );

        callback(
          new Error(
            JSON.stringify({
              message,
              reqId,
              err,
              detail: err.message,
            })
          )
        );
      }
    } else {
      resource.logger.error(
        {
          message: "BAD_REQUEST",
          detail: serviceResponse,
          reqId,
        },
        "grpc method call error: bad request"
      );

      callback(
        new Error(
          JSON.stringify({
            message: "BAD_REQUEST",
            detail: serviceResponse,
            reqId,
          })
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
