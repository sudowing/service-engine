import * as Router from "@koa/router";
import * as HTTP_STATUS from "http-status";

import { getDatabaseResources, genDatabaseResourceValidators } from "./queries";
import { genDatabaseResourceOpenApiDocs } from "./openapi";
import { Resource } from "./class";
import { uuid } from "./utils";

import { parse as parseURL } from "url";

const uniqueResource = (url: string) =>
  parseURL(url, true).pathname.endsWith("/record");

const seperateQueryAndContext = (input) =>
  Object.entries(input).reduce(
    (query, [key, value]) => {
      const info = key.startsWith("|") ? query.context : query.payload;
      info[key.replace("|", "")] = value;
      return query;
    },
    { payload: {}, context: {} }
  );

const j = JSON.stringify; // convience
const operations = new Map();
operations.set(j({ method: "POST", record: false }), "create");
operations.set(j({ method: "GET", record: false }), "search");
operations.set(j({ method: "PUT", record: true }), "update");
operations.set(j({ method: "DELETE", record: true }), "delete");
operations.set(j({ method: "GET", record: true }), "read");

export const serviceRouters = async ({ db, st, logger }) => {
  const router = new Router();

  const { validators, dbResources } = await genDatabaseResourceValidators({
    db,
  });
  const { rows: dbResourceRawRows } = await db.raw(
    getDatabaseResources({ db })
  );
  const apiDocs = await genDatabaseResourceOpenApiDocs({
    db,
    st,
    logger,
  });

  router.get("/ping", (ctx) => {
    ctx.response.body = { hello: "world", now: Date.now() };
  });

  router.get("/openapi", async (ctx) => {
    ctx.response.body = apiDocs;
  });

  router.get("/db_resources", async (ctx) => {
    ctx.response.body = dbResources;
  });

  router.get("/db_resources/raw", async (ctx) => {
    ctx.response.body = dbResourceRawRows;
  });

  router.get("/resources", async (ctx) => {
    const resources = Object.entries(validators).reduce(
      (batch, [name, validator]: any) => ({
        ...batch,
        [name]: new Resource({ db, st, logger, name, validator }).report,
      }),
      {}
    );
    ctx.response.body = resources;
  });

  const serviceView = async (ctx) => {
    const requestId = uuid();
    ctx.set("x-request-id", requestId);
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

    const resources = Object.entries(validators).reduce(
      (batch, [name, validator]: any) => ({
        ...batch,
        [name]: new Resource({ db, st, logger, name, validator }),
      }),
      {}
    );

    // only process for /service & /debug && only if resource exists and operation on resource exists
    if (
      (category !== "service" && category !== "debug") ||
      !operations.has(j({ method, record })) ||
      !resources.hasOwnProperty(resource)
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
      ? seperateQueryAndContext(ctx.request.query)
      : seperateQueryAndContext({
        ...stripKeys(resources[resource].meta.uniqueKeyComponents, ctx.request.body),
        ...ctx.request.query
      }) // keys must come from querystring

    const serviceResponse = resources[resource][operation]({
      ...input,
      requestId,
    });

    // create(input: ts.IParamsProcessBase) {
    // read(input: ts.IParamsProcessBase) {
    // update(input: ts.IParamsProcessWithSearch) {
    // delete(input: ts.IParamsProcessDelete) {
    // search(input: ts.IParamsProcessBase) {

    // IParamsProcessBase
    //   payload: any;
    //   context?: any;
    //   requestId: string;

    // IParamsProcessWithSearch extends IParamsProcessBase
    //   searchQuery?: any;

    // IParamsProcessDelete extends IParamsProcessWithSearch
    //   hardDelete?: boolean;

    // insert db, components
    if (serviceResponse.result) {
      const sqlString = serviceResponse.result.sql.toString();
      serviceResponse.result.sqlString = sqlString;
      ctx.set("x-sql", sqlString);

      if (category === "service") {
        records = await serviceResponse.result.sql;
      }
      delete serviceResponse.result.sql;
    }
    else {
      ctx.response.status = HTTP_STATUS.BAD_REQUEST;
      ctx.response.body = serviceResponse;
      return;
    }

    // ON UPDATE
    //   MUST REQUIRE KEYS----

    // if single record searched and not returned -- 404

    const output =
      category === "service"
        ? record
          ? records[0] || null
          : records
        : {
            now: Date.now(),
            requestId,
            url,
            record,
            method,
            category,
            resource,
            operation,
            input,
            serviceResponse,
          };

    if (output === null) {
      ctx.status = HTTP_STATUS.NOT_FOUND;
      return;
    }

    ctx.response.body = output;
  };

  router.get("/:category/:resource", serviceView);
  router.post("/:category/:resource", serviceView);

  router.get("/:category/:resource/record", serviceView);
  router.post("/:category/:resource/record", serviceView);
  router.put("/:category/:resource/record", serviceView);
  router.delete("/:category/:resource/record", serviceView);

  return { router };
};
