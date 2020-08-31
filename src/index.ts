import * as cors from "@koa/cors";
import { ApolloServer } from "apollo-server-koa";
import { createLogger } from "bunyan";
import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";

import { Resource } from "./class";
import { author } from "./credit";
import { aggregationFnBuilder } from "./database";
import { gqlModule } from "./graphql";
import { getDatabaseResources } from "./integration";
import {
  IObjectTransformerMap,
  TDatabaseResources,
  IComplexResourceConfig,
} from "./interfaces";
import { prepRequestForService } from "./middleware";
import { serviceRouters } from "./routers";
import { genDatabaseResourceValidators, castBoolean } from "./utils";

// currently this is server wide setting. future will be per resource
const ENABLE_HARD_DELETE = process.env.ENABLE_HARD_DELETE
  ? castBoolean(process.env.ENABLE_HARD_DELETE)
  : true;

export const ignite = async ({
  db,
  metadata,
  resourceSearchMiddleware: middlewarz,
  complexResources,
}: {
  db: any;
  metadata: any;
  resourceSearchMiddleware?: IObjectTransformerMap;
  complexResources?: IComplexResourceConfig[];
}) => {
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
        middlewareFn:
          middlewarz && middlewarz[name] ? middlewarz[name] : undefined,
      }),
    ]
  );

  // build the complex resources based on the provided configs
  (complexResources || []).forEach(
    ({ topResourceName, subResourceName, calculated_fields, group_by }) => {
      // confirm they exist else
      if (!dbResources[topResourceName] || !dbResources[subResourceName]) {
        logger.fatal({
          message: "server start failed: server improperly configured",
          detail:
            "one of the resources provided for a complexResource does not exist. Make sure both are reflected in the DB as tables, views or materialized views. They must exist at boot so this system can auto generate the appropriate @hapi/joi validators -- which drive all of the REST & GraphQL interfaces (and auto documentation)",
          complex_query: { topResourceName, subResourceName },
        });
        process.exitCode = 1;
        process.kill(process.pid, "SIGINT");
      }

      const name = `${topResourceName}:${subResourceName}`;
      Resources.push([
        name,
        new Resource({
          db,
          st,
          logger,
          name,
          validator: validators[topResourceName],
          schemaResource: mapSchemaResources[topResourceName],
          middlewareFn:
            middlewarz && middlewarz[name] ? middlewarz[name] : undefined,
          subResourceName,
          aggregationFn: aggregationFnBuilder(db)(calculated_fields, group_by),
        }),
      ]);
    }
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

  return { App, logger, apolloServer };
};
