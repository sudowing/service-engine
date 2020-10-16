import * as Router from "@koa/router";

import { genDatabaseResourceOpenApiDocs } from "./openapi";
import * as cnst from "./const";
import { gqlModule } from "./graphql";
import { grpcModule } from "./grpc";

import { genResourcesMap } from "./utils";
import { serviceView } from "./views";

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
  toProtoScalar,
  hardDelete,
  supportsReturn,
  permissions,
}) => {
  const appRouter = new Router();
  const serviceRouter = new Router({
    prefix: metadata.routerPrefix,
  });

  const ResourceReports = Resources.map(([name, resource]) => [
    name,
    resource.report,
  ]);

  // these two below are very similar.  difference is one returns only the `.report`
  const resourcesMap = genResourcesMap(Resources);
  const resourcesReports = Resources.reduce(
    (batch, [name, _Resource]: any) => ({
      ...batch,
      [name]: _Resource.report,
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
    supportsReturn,
    permissions,
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
    supportsReturn,
    permissions,
  });

  const { typeDefsString } = await gqlModule({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toSchemaScalar,
    hardDelete,
    metadata,
    supportsReturn,
    permissions,
  });

  const { protoString } = await grpcModule({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toProtoScalar,
    hardDelete,
    metadata,
    supportsReturn,
    permissions,
  });

  appRouter.get("/proto", async (ctx) => {
    ctx.response.body = protoString;
  });

  appRouter.get("/schema", async (ctx) => {
    ctx.response.body = typeDefsString;
  });

  appRouter.get("/healthz", (ctx) => {
    const { db_info, ...rest } = metadata;
    ctx.response.body = {
      serviceVersion: cnst.SERVICE_VERSION,
      timestamp: Date.now(),
      metadata: rest,
      db_info,
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
    ctx.response.body = resourcesReports;
  });

  const resourceView = serviceView({
    operations,
    permissions,
    resourcesMap,
    hardDelete,
    logger,
    db,
    supportsReturn,
  });

  serviceRouter.get("/:category/:resource", resourceView);
  serviceRouter.post("/:category/:resource", resourceView);

  serviceRouter.get("/:category/:resource/record", resourceView);
  serviceRouter.post("/:category/:resource/record", resourceView);
  serviceRouter.put("/:category/:resource/record", resourceView);
  serviceRouter.delete("/:category/:resource/record", resourceView);

  return { appRouter, serviceRouter };
};
