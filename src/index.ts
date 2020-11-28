import * as cors from "@koa/cors";
import { ApolloServer } from "apollo-server-koa";
import { createLogger } from "bunyan";
import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";
import * as HTTP_STATUS from "http-status";

import {
  DEFAULT_PAGINATION_LIMIT,
  PERMIT_CRUD,
  DEFAULT_GRPC_PORT,
} from "./const";
import { author } from "./credit";
import {
  IObjectTransformerMap,
  IComplexResourceConfig,
  IObjectStringByGeneric,
  IServicePermission,
  IConfigServicePermission,
} from "./interfaces";
import { prepRequestForService } from "./middleware";
import { prepare } from "./setup";
import {
  castBoolean,
  supportsReturnOnCreateAndUpdate,
  extractPermissions,
} from "./utils";

export {
  initPostProcessing,
  permit,
  genNextMigrationName,
  modularMigration,
} from "./utils";

// currently this is server wide setting. future will be per resource
const ENABLE_HARD_DELETE = process.env.ENABLE_HARD_DELETE
  ? castBoolean(process.env.ENABLE_HARD_DELETE)
  : true;

export const ignite = async ({
  db,
  metadata,
  resourceSearchMiddleware,
  complexResources,
  systemPermissions,
  resourcePermissions,
  paginationLimit,
  grpcPort,
}: {
  db: any;
  metadata: any;
  resourceSearchMiddleware?: IObjectTransformerMap;
  complexResources?: IComplexResourceConfig[];
  systemPermissions?: IServicePermission;
  resourcePermissions?: IObjectStringByGeneric<IServicePermission>;
  paginationLimit?: string | number;
  grpcPort?: string | number;
}) => {
  // only if db is postgres. will have to alter for mysql etc
  const st = knexPostgis(db);

  const supportsReturn = supportsReturnOnCreateAndUpdate(
    db.client.config.client
  );

  const permissions: IConfigServicePermission = {
    systemPermissions: systemPermissions
      ? extractPermissions({ systemPermissions }).systemPermissions
      : PERMIT_CRUD,
    resourcePermissions: extractPermissions(resourcePermissions || {}),
  };

  // this is set here as it is used by the router && the openapi doc generator
  metadata.appName = metadata.shortAppName || "service-engine-app";
  metadata.routerPrefix = `/${metadata.appName}`;

  const logger = createLogger({
    name: metadata.appName,
    level: 0,
  });

  const pageLimit = paginationLimit
    ? Number(paginationLimit)
    : DEFAULT_PAGINATION_LIMIT;

  const {
    appRouter,
    serviceRouter,
    AppModule,
    AppShortName,
    grpcService,
  } = await prepare({
    db,
    st,
    metadata,
    logger,
    middleware: resourceSearchMiddleware,
    supportsReturn,
    complexResources,
    hardDelete: ENABLE_HARD_DELETE,
    permissions,
    pageLimit,
    grpcPort: grpcPort || DEFAULT_GRPC_PORT,
  });

  const { schema, context } = AppModule;
  const apolloServer = new ApolloServer({ schema, context }); // ,debug

  const App = new Koa()
    .use(cors())
    .use(
      bodyParser({
        onerror(err, ctx) {
          // want to log the error
          const message = "body parse error";

          logger.error({ err }, message);

          ctx.response.status = HTTP_STATUS.UNPROCESSABLE_ENTITY;
          ctx.response.body = {
            message,
            error: err,
          };

          // TODO: figure out why this response isn't stopping the processing of the request

          ctx.throw("body parse error", 422);
        },
      })
    )
    .use(prepRequestForService(logger))
    .use(compress())
    .use(appRouter.routes())
    .use(appRouter.allowedMethods())
    .use(serviceRouter.routes())
    .use(serviceRouter.allowedMethods());

  apolloServer.applyMiddleware({
    app: App,
    path: `/${metadata.appName}/graphql/`,
  });

  // little self promotion for all my effort :+1:
  logger.info(author, `🤝 Let's do some work together!`);

  return { App, logger, apolloServer, AppShortName, grpcService };
};
