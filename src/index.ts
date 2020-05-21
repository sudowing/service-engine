import * as cors from "@koa/cors";
// import { ApolloServer } from "apollo-server-koa";
// import * as config from 'config';

import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";

import { createLogger } from "bunyan";

import { prepRequestForService } from "./middleware";
import { serviceRouters } from "./routers";

export const ignite = async ({ db, metadata }) => {
  // only if db is postgres. will have to alter for mysql etc
  const st = knexPostgis(db);

  // this is set here as it is used by the router && the openapi doc generator
  metadata.appName = metadata.shortAppName || 'service-engine-app';
  metadata.routerPrefix = `/${metadata.appName}`;


  const logger = createLogger({
    name: metadata.appName,
    level: 0,
  });

  const { appRouter, serviceRouter } = await serviceRouters({ db, st, logger, metadata });

  const App = new Koa()
    .use(cors())
    .use(bodyParser())
    .use(prepRequestForService)    
    .use(appRouter.routes())
    .use(appRouter.allowedMethods())
    .use(serviceRouter.routes())
    .use(serviceRouter.allowedMethods())
    .use(compress());

  return { App, logger };
};
