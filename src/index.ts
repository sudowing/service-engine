import * as cors from "@koa/cors";
import { ApolloServer } from "apollo-server-koa";
// import * as config from 'config';

import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";

import { createLogger } from "bunyan";

import { prepRequestForService } from "./middleware";
import { serviceRouters } from "./routers";
import { getDatabaseResources, genDatabaseResourceValidators } from "./queries";
import { Resource } from "./class";
import { TDatabaseResources } from "./interfaces";
import { gqlModule } from "./graphql";

export const ignite = async ({ db, metadata }) => {
  // only if db is postgres. will have to alter for mysql etc
  const st = knexPostgis(db);

  // this is set here as it is used by the router && the openapi doc generator
  metadata.appName = metadata.shortAppName || "service-engine-app";
  metadata.routerPrefix = `/${metadata.appName}`;

  const logger = createLogger({
    name: metadata.appName,
    level: 0,
  });

  const { rows: dbResourceRawRows } = await db.raw(
    getDatabaseResources({ db })
  );
  const { validators, dbResources } = await genDatabaseResourceValidators({
    db,
    dbResourceRawRows,
  });

  const mapSchemaResources = dbResourceRawRows.reduce(
    (resourceMap, { resource_schema, resource_name }) => ({
      ...resourceMap,
      [`${resource_schema}_${resource_name}`]: {
        resource_schema,
        resource_name,
      },
    }),
    {}
  );

  // this has other uses -- needs to be isolated
  const Resources = Object.entries(validators).map(
    ([name, validator]: TDatabaseResources) => [
      name,
      new Resource({
        db,
        st,
        logger,
        name,
        validator,
        schemaResource: mapSchemaResources[name],
      }),
    ]
  );

  const { AppModule } = await gqlModule({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
  });

  const { schema, context } = AppModule;

  const apolloServer = new ApolloServer({ schema, context }); // ,debug

  const { appRouter, serviceRouter } = await serviceRouters({
    db,
    st,
    logger,
    metadata,
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
  });

  const App = new Koa()
    .use(cors())
    .use(bodyParser())
    .use(prepRequestForService)
    .use(appRouter.routes())
    .use(appRouter.allowedMethods())
    .use(serviceRouter.routes())
    .use(serviceRouter.allowedMethods())
    .use(compress());

  apolloServer.applyMiddleware({
    app: App,
    path: `/${metadata.appName}/graphql/`,
  });

  return { App, logger, apolloServer };
};
