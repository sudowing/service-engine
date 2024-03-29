import { parse as parseURL } from "url";

import * as HTTP_STATUS from "http-status";

import * as cnst from "../const";
import { genCountQuery } from "../database";
import * as ts from "../interfaces";
import { callComplexResource, permitted } from "../utils";

const j = JSON.stringify; // convience

const uniqueResource = (tail: string, url: string) =>
  parseURL(url, true).pathname.endsWith(tail);

// can maybe add prefix to fn signature and use to parse out subquery payload
const seperateQueryAndContext = (input) =>
  Object.entries(input).reduce(
    (query, [key, value]) => {
      const info = key.startsWith(cnst.PIPE) ? query.context : query.payload;
      info[key.replace(cnst.PIPE, "")] = value;
      return query;
    },
    { payload: {}, context: {}, apiType: "REST" } // apiType -- needed for correct queryContext parsing
  );

export const serviceView =
  ({
    operations,
    permissions,
    resourcesMap,
    hardDelete,
    logger,
    db,
    supportsReturn,
  }) =>
  async (ctx) => {
    const { reqId } = ctx.state;
    let records = null;

    // '/:category/:resource/record
    const { category, resource } = ctx.params;
    const method = ctx.method;
    const url = ctx.request.url;
    const record = uniqueResource("/record", url);

    const operation = operations.get(j({ method, record }));

    const permit = permitted(permissions)(resource, operation);

    // only process for /service & /debug, resource && CRUD operation exists, and 404 trailing slashes
    if (
      (category !== "service" && category !== "debug") ||
      !operations.has(j({ method, record })) ||
      !permit ||
      !resourcesMap.hasOwnProperty(resource) ||
      uniqueResource("/record/", url) // no trailing slash
    ) {
      ctx.response.status = HTTP_STATUS.NOT_FOUND;
      ctx.response.body = cnst.SERVICE_RESOURCE_NOT_FOUND_BODY;
      return;
    }

    const stripKeys = (keys: string[], obj: object) =>
      Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key))
      );

    // TODO: clean this mess up. can be much simplier I think
    const input = seperateQueryAndContext(ctx.request.query);

    if (method !== "GET") {
      input.payload =
        method === "POST"
          ? ctx.request.body
          : {
              ...stripKeys(
                resourcesMap[resource].meta.uniqueKeyComponents,
                ctx.request.body
              ),
              ...input.payload, // keys are in payload --> sent from qs
            };
    }

    const payload:
      | ts.IParamsProcessBase
      | ts.IParamsProcessWithSearch
      | ts.IParamsProcessDelete = {
      ...input,
      requestId: reqId,
    };

    if (operation === cnst.DELETE.toLowerCase()) {
      // fighting typescript a little here. a bit tired to work out the details
      // tslint:disable-next-line: no-string-literal
      payload["hardDelete"] = !!hardDelete;
    }

    const asyncServiceResponse = resourcesMap[resource].hasSubquery
      ? callComplexResource(resourcesMap, resource, operation, payload)
      : resourcesMap[resource][operation]({ ...payload });
    const serviceResponse = await asyncServiceResponse; // validation is now async!

    // insert db, components
    if (serviceResponse.result) {
      const sqlString = serviceResponse.result.sql.toString();
      serviceResponse.result.sqlString = sqlString;

      if (ctx.get(cnst.HEADER_GET_SQL)) {
        ctx.set(cnst.HEADER_SQL, sqlString);
      }

      if (category === "service") {
        let dbCallSuccessful = true; // do not try to get count if db call fails
        try {
          const _records = await serviceResponse.result.sql;
          records = resourcesMap[resource].transformRecords(_records);
        } catch (err) {
          records = [
            {
              error: err,
              request_detail: {
                category,
                resource,
                method,
                record,
                reqId,
                operation,
                sql: serviceResponse.result.sql.toString(),
              },
            },
          ]; // put in array so `output` defined correcly with `record` ternary
          logger.error(records[0], cnst.DB_CALL_FAILED);
          ctx.response.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
          dbCallSuccessful = false;
        }

        if (
          dbCallSuccessful &&
          operation === "search" &&
          ctx.get(cnst.HEADER_GET_COUNT)
        ) {
          // TODO: instead of building new object `args` -- can prob just delete keys from `payload`
          const args = {
            ...payload,
            reqId,
          };

          const unsupportedSearchContextKeys = ["orderBy", "page", "limit"];
          unsupportedSearchContextKeys.forEach((key) => {
            if (args.context.hasOwnProperty(key)) {
              delete args.context[key];
            }
          });

          const _asyncServiceResponseCount = resourcesMap[resource].hasSubquery
            ? callComplexResource(resourcesMap, resource, operation, args)
            : resourcesMap[resource][operation](args);

          const { result: searchCountResult } =
            await _asyncServiceResponseCount;

          const sqlSearchCount = genCountQuery(db, searchCountResult.sql);
          const [{ count }] = await sqlSearchCount; // can/should maybe log this
          ctx.set(cnst.HEADER_COUNT, count);
        }
      }
      delete serviceResponse.result.sql;
    } else {
      ctx.response.status = HTTP_STATUS.BAD_REQUEST;
      ctx.response.body = serviceResponse;
      return;
    }

    let output;
    if (category === "service") {
      output = record
        ? Array.isArray(records)
          ? records[0]
          : { count: records } // unique resources that are not arrays are only delete
        : method !== "POST"
        ? records
        : Array.isArray(payload.payload)
        ? records
        : records[0];
    } else {
      // 'debug' only
      output = {
        now: Date.now(),
        reqId,
        url,
        record,
        method,
        category,
        resource,
        operation,
        input,
        serviceResponse,
      };
    }

    if ([null, undefined].includes(output)) {
      ctx.status = HTTP_STATUS.NOT_FOUND;
      return;
    }

    // not all dialects return data. for those that dont -- send 204 & NOBODY

    if (
      !supportsReturn &&
      [cnst.CREATE.toLowerCase(), cnst.UPDATE.toLowerCase()].includes(operation)
    ) {
      ctx.status = HTTP_STATUS.NO_CONTENT;
      return;
    }

    ctx.response.body = output;
  };
