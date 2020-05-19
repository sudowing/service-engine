import * as Router from "@koa/router";
import * as HTTP_STATUS from "http-status";

import { getDatabaseResources, genDatabaseResourceValidators } from "./queries";
import { genDatabaseResourceOpenApiDocs } from "./openapi";
import { Resource } from "./class";
import * as cnst from "./const";
import { prepRequestForService } from "./middleware";

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

  router.use(prepRequestForService);

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
            ...stripKeys(
              resources[resource].meta.uniqueKeyComponents,
              ctx.request.body
            ),
            ...ctx.request.query,
          }); // keys must come from querystring

    let sqlSearchCount = null; // placeholder for unpagination count
    const serviceResponse = resources[resource][operation]({
      ...input,
      reqId,
    });

    // insert db, components
    if (serviceResponse.result) {
      const sqlString = serviceResponse.result.sql.toString();
      serviceResponse.result.sqlString = sqlString;

      if (ctx.get(cnst.HEADER_GET_SQL)) {
        ctx.set(cnst.HEADER_SQL, sqlString);
      }

      if (category === "service") {
        records = await serviceResponse.result.sql;

        if (operation === 'search' && ctx.get(cnst.HEADER_GET_COUNT)) {
          const {result: searchCountResult} = resources[resource][operation]({
            payload: input.payload,
            reqId,
          });
  
          sqlSearchCount = db.from(db.raw(`(${searchCountResult.sql.toString()}) as main`));
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
