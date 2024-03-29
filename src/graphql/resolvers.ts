import { UserInputError } from "apollo-server-koa";

import { NON_RETURNING_SUCCESS_RESPONSE } from "../const";
import { genCountQuery } from "../database";
import { IServiceResolverResponse, IClassResourceMap } from "../interfaces";
import {
  contextTransformer,
  callComplexResource,
  extractSelectedFields,
  gqlParsePayload,
} from "../utils";

const apiType = "GRAPHQL";
export const makeServiceResolver =
  (resourcesMap: IClassResourceMap) =>
  (resource, hardDelete: boolean, supportsReturn: boolean) =>
  (operation: string) =>
  async (obj, args, ctx, info) => {
    const reqId = ctx.reqId || "reqId no issued";
    const defaultInput = {
      payload: {},
      context: {},
      options: {},
      subquery: {},
    };

    const input = { ...defaultInput, ...args };
    const { payload, context, options, keys, subquery } = input;

    // tslint:disable-next-line: prefer-const
    let { props, fields } = extractSelectedFields(info);
    const callDatabase = props.includes("data");

    if (!supportsReturn && ["create", "update"].includes(operation)) {
      fields = [];
    }
    context.fields = fields;

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
        const sql = serviceResponse.result.sql.toString();
        const _records = callDatabase ? await serviceResponse.result.sql : [];
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
        const debug = {
          now: Date.now(),
          reqId,
          input: {
            payload,
            context,
            options,
          },
          serviceResponse,
        };

        if (subquery) {
          // @ts-ignore
          debug.input.subPayload = subPayload;
        }

        // send count as additional field
        const response: IServiceResolverResponse = {
          data: singleRecord ? (data.length ? data[0] : null) : data,
          sql,
          debug,
        };

        if (callDatabase && operation === "search" && options.count) {
          // later could apply to update & delete

          const {
            seperator,
            notWhere,
            statementContext,
            distinct,
            fields: _fields,
          } = query.context;
          query.context = {
            seperator,
            notWhere,
            statementContext,
            distinct,
            fields: _fields,
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

        return response;

        // if single record searched and not returned -- 404
        // if ([null, undefined].includes(output)) {
      } catch (err) {
        // log error && // not a user input error
        throw new UserInputError("cnst.INTERNAL_SERVER_ERROR", {
          detail: serviceResponse,
          reqId,
        });
      }
    } else {
      throw new UserInputError("HTTP_STATUS.BAD_REQUEST", {
        detail: serviceResponse,
        reqId,
      });
    }
  };
