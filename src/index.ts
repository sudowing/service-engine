import * as cors from "@koa/cors";
// import { ApolloServer } from "apollo-server-koa";
// import * as config from 'config';

import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";

import { createLogger } from "bunyan";

import { serviceRouters } from "./routers";

export const ignite = async ({ db, metadata }) => {
  // only if db is postgres. will have to alter for mysql etc
  const st = knexPostgis(db);

  const logger = createLogger({
    name: metadata.appShortName || "service-engine",
    level: 0,
  });

  const { router } = await serviceRouters({ db, st, logger, metadata });

  const App = new Koa()
    .use(cors())
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .use(compress());

  return { App, logger };
};
