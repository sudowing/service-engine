import { parse as parseURL } from "url";

import * as Router from "@koa/router";
import * as HTTP_STATUS from "http-status";

import { genDatabaseResourceOpenApiDocs } from "./openapi";
import * as cnst from "./const";
import { genCountQuery } from "./database";
import * as ts from "./interfaces";
import { gqlModule } from "./graphql";
import { callComplexResource, genResourcesMap } from "./utils";

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

  // const resourcesMap = Resources.reduce(
  //   (batch, [name, _Resource]: any) => ({
  //     ...batch,
  //     [name]: _Resource,
  //   }),
  //   {}
  // );

  const resourcesMap = genResourcesMap(Resources);

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

  appRouter.get("/healthz", (ctx) => {
    ctx.response.body = {
      serviceVersion: cnst.SERVICE_VERSION,
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
    const { resource } = ctx.request.query; // little helper functionality to speed debugging
    ctx.response.body =
      resource && dbResources[resource]
        ? { [resource]: dbResources[resource] }
        : dbResources;
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
    const record = uniqueResource("/record", url);

    // only process for /service & /debug, resource && CRUD operation exists, and 404 trailing slashes
    if (
      (category !== "service" && category !== "debug") ||
      !operations.has(j({ method, record })) ||
      !resourcesMap.hasOwnProperty(resource) ||
      uniqueResource("/record/", url) // no trailing slash
    ) {
      ctx.response.status = HTTP_STATUS.NOT_FOUND;
      ctx.response.body = cnst.SERVICE_RESOURCE_NOT_FOUND_BODY
      return;
    }

    const operation = operations.get(j({ method, record }));

    const stripKeys = (keys: string[], obj: object) =>
      Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key))
      );








    // TODO: clean this mess up. can be much simplier I think
    const input = seperateQueryAndContext(ctx.request.query)
    if(method !== 'GET'){
      input.payload = method === 'POST'
        ? ctx.request.body
        : {
          ...stripKeys(
            resourcesMap[resource].meta.uniqueKeyComponents,
            ctx.request.body
          ),
          ...input.payload // keys are in payload --> sent from qs
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


    console.log('record')
    console.log(record)

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
        try{
          records = await serviceResponse.result.sql;
        }
        catch(err){
          records = [{
            error: err,
            request_detail: {
              category, resource, method, record,
              reqId, operation,
            }
          }] // put in array so `output` defined correcly with `record` ternary
          logger.error(records[0], 'db call resulted in error');
          ctx.response.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        }

        if (operation === "search" && ctx.get(cnst.HEADER_GET_COUNT)) {
          // TODO: instead of building new object `args` -- can prob just delete keys from `payload`
          const args = {
            payload: input.payload,
            reqId,
          };

          const _asyncServiceResponseCount = resourcesMap[resource].hasSubquery
            ? callComplexResource(resourcesMap, resource, operation, args)
            : resourcesMap[resource][operation](args);

          const {
            result: searchCountResult,
          } = await _asyncServiceResponseCount;

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
        : method !== 'POST' ? records : Array.isArray(payload.payload) ? records : records[0]
    }
    else { // 'debug' only
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
