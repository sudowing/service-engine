import * as Router from "@koa/router";
import * as HTTP_STATUS from "http-status";

import { genDatabaseResourceOpenApiDocs } from "./openapi";
import * as cnst from "./const";
import * as ts from "./interfaces";
import { gqlModule } from "./graphql";

import { parse as parseURL } from "url";

const uniqueResource = (url: string) =>
  parseURL(url, true).pathname.endsWith("/record");

// can maybe add prefix to fn signature and use to parse out subquery payload
const seperateQueryAndContext = (input) =>
  Object.entries(input).reduce(
    (query, [key, value]) => {
      const info = key.startsWith("|") ? query.context : query.payload;
      info[key.replace("|", "")] = value;
      return query;
    },
    { payload: {}, context: {}, apiType: "REST" } // apiType -- needed for corrent queryContext parsing
  );

const j = JSON.stringify; // convience
const operations = new Map();
operations.set(j({ method: "POST", record: false }), "create");
operations.set(j({ method: "GET", record: false }), "search");
operations.set(j({ method: "PUT", record: true }), "update");
operations.set(j({ method: "DELETE", record: true }), "delete");
operations.set(j({ method: "GET", record: true }), "read");

export const serviceRouters = async ({
  db,
  st,
  logger,
  metadata,
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
  toSchemaScalar,
  hardDelete,
}) => {
  const appRouter = new Router();
  const serviceRouter = new Router({
    prefix: metadata.routerPrefix,
  });

  const ResourceReports = Resources.map(([name, resource]) => [
    name,
    resource.report,
  ]);

    // THIS NEEDS TO BE MOVED HIGHER! DOESN'T NEED TO BE DONE PER REQUEST

    const resourcesMap = Resources.reduce(
      (batch, [name, _Resource]: any) => ({
        ...batch,
        [name]: _Resource,
      }),
      {}
    );

  const apiDocs = await genDatabaseResourceOpenApiDocs({
    db,
    st,
    logger,
    metadata,
    validators,
    dbResources,
    ResourceReports,
    debugMode: false,
  });
  const apiDocsDebug = await genDatabaseResourceOpenApiDocs({
    db,
    st,
    logger,
    metadata,
    validators,
    dbResources,
    ResourceReports,
    debugMode: true,
  });

  appRouter.get("/schema", async (ctx) => {
    const { typeDefsString } = await gqlModule({
      validators,
      dbResources,
      dbResourceRawRows,
      Resources,
      toSchemaScalar,
      hardDelete,
    });
    ctx.response.body = typeDefsString;
  });

  appRouter.get("/ping", (ctx) => {
    ctx.response.body = {
      message: "hello world",
      timestamp: Date.now(),
      metadata,
    };
  });

  appRouter.get("/openapi", async (ctx) => {
    const { debug } = ctx.request.query;
    const docs = debug ? apiDocsDebug : apiDocs;
    ctx.response.body = docs;
  });

  appRouter.get("/db_resources", async (ctx) => {
    ctx.response.body = dbResources;
  });

  appRouter.get("/db_resources/raw", async (ctx) => {
    ctx.response.body = dbResourceRawRows;
  });

  appRouter.get("/resources", async (ctx) => {
    const resources = Resources.reduce(
      (batch, [name, _Resource]: any) => ({
        ...batch,
        [name]: _Resource.report,
      }),
      {}
    );
    ctx.response.body = resources;
  });

  const serviceView = async (ctx) => {
    const { reqId } = ctx.state;
    let records = null;

    // '/:category/:resource/record
    const { category, resource } = ctx.params;
    const method = ctx.method;
    const url = ctx.request.url;
    const record = uniqueResource(url);

    // only process for /service & /debug
    if (category !== "service" && category !== "debug") {
      ctx.response.status = HTTP_STATUS.NOT_FOUND;
      return;
    }



    // only process for /service & /debug && only if resource exists and operation on resource exists
    if (
      (category !== "service" && category !== "debug") ||
      !operations.has(j({ method, record })) ||
      !resourcesMap.hasOwnProperty(resource)
    ) {
      ctx.response.status = HTTP_STATUS.NOT_FOUND;
      return;
    }

    const operation = operations.get(j({ method, record }));

    const stripKeys = (keys: string[], obj: object) =>
      Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key))
      );

    const input =
      method === "GET"
        ? seperateQueryAndContext(ctx.request.query) // this needs to parse out subquery input from main input
        : seperateQueryAndContext({
            ...stripKeys(
              resourcesMap[resource].meta.uniqueKeyComponents,
              ctx.request.body
            ),
            ...ctx.request.query,
          }); // keys must come from querystring

    let sqlSearchCount = null; // placeholder for unpagination count

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

    // this is where I'll select the complex resource and submit the payload. `operation` === '.search'
    const serviceResponse = resourcesMap[resource][operation]({ ...payload });

    // insert db, components
    if (serviceResponse.result) {
      const sqlString = serviceResponse.result.sql.toString();
      serviceResponse.result.sqlString = sqlString;

      if (ctx.get(cnst.HEADER_GET_SQL)) {
        ctx.set(cnst.HEADER_SQL, sqlString);
      }

      if (category === "service") {
        records = await serviceResponse.result.sql;

        if (operation === "search" && ctx.get(cnst.HEADER_GET_COUNT)) {
          const { result: searchCountResult } = resourcesMap[resource][operation]({
            payload: input.payload,
            reqId,
          });

          sqlSearchCount = db.from(
            db.raw(`(${searchCountResult.sql.toString()}) as main`)
          );
          // this is needed to make the db result mysql/postgres agnostic
          sqlSearchCount.count("* as count");

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

    // if single record searched and not returned -- 404

    const output =
      category === "service"
        ? record
          ? Array.isArray(records)
            ? records[0]
            : { count: records } // unique resources that are not arrays are only delete
          : records
        : {
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

    if ([null, undefined].includes(output)) {
      ctx.status = HTTP_STATUS.NOT_FOUND;
      return;
    }

    ctx.response.body = output;
  };

  serviceRouter.get("/:category/:resource", serviceView);
  serviceRouter.post("/:category/:resource", serviceView);

  serviceRouter.get("/:category/:resource/record", serviceView);
  serviceRouter.post("/:category/:resource/record", serviceView);
  serviceRouter.put("/:category/:resource/record", serviceView);
  serviceRouter.delete("/:category/:resource/record", serviceView);

  return { appRouter, serviceRouter };
};
