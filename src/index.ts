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
import { getDatabaseResources } from "./integration";
import { genDatabaseResourceValidators, castBoolean } from "./utils";
import { Resource } from "./class";
import { TDatabaseResources } from "./interfaces";
import { gqlModule } from "./graphql";

// currently this is server wide setting. future will be per resource
const ENABLE_HARD_DELETE = process.env.ENABLE_HARD_DELETE
  ? castBoolean(process.env.ENABLE_HARD_DELETE)
  : true;

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

  // these are specific to the db engine version
  const { dbSurveyQuery, joiBase, toSchemaScalar } = getDatabaseResources({
    db,
  });

  const payload = await db.raw(dbSurveyQuery);
  // const { rows: dbResourceRawRows } = payload;
  const dbResourceRawRows = payload.hasOwnProperty("rows")
    ? payload.rows
    : payload;

  const { validators, dbResources } = await genDatabaseResourceValidators({
    db,
    dbResourceRawRows,
    joiBase,
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

  const middlewarz = {
    public_account: item => ({...item, email: 'clark.kent@dailybugle.net'}),
  }

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
        middlewareFn: middlewarz[name] || undefined,
      }),
    ]
  );

  const { AppModule } = await gqlModule({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toSchemaScalar,
    hardDelete: ENABLE_HARD_DELETE,
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
    toSchemaScalar,
    hardDelete: ENABLE_HARD_DELETE,
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

  // little self promotion for all my effort :+1:
  logger.info(
    {
      author: "Joe Wingard",
      linkedin: "https://www.linkedin.com/in/joewingard/",
      github: "https://github.com/sudowing",
      docker: "https://hub.docker.com/_/sudowing",
      keybase: "https://keybase.io/sudowing",
    },
    `🤝 Let's do some work together!`
  );

  return { App, logger, apolloServer };
};
