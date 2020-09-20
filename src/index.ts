import * as cors from "@koa/cors";
import { ApolloServer } from "apollo-server-koa";
import { createLogger } from "bunyan";
import * as knexPostgis from "knex-postgis";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as compress from "koa-compress";
import * as HTTP_STATUS from "http-status";

import { Resource } from "./class";
import { STARTUP_FAILED } from "./const";
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
import {
  genDatabaseResourceValidators,
  castBoolean,
  supportsReturnOnCreateAndUpdate,
} from "./utils";

export { initPostProcessing } from "./utils";

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

  const supportsReturn = supportsReturnOnCreateAndUpdate(
    db.client.config.client
  );

  // this is set here as it is used by the router && the openapi doc generator
  metadata.appName = metadata.shortAppName || "service-engine-app";
  metadata.routerPrefix = `/${metadata.appName}`;

  const logger = createLogger({
    name: metadata.appName,
    level: 0,
  });

  // these are specific to the db engine version
  const {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    dbGeometryColumns,
  } = getDatabaseResources({
    db,
  });

  const [dbResourceRawRows, dbVersionRawRows] = await Promise.all([
    db.raw(dbSurveyQuery),
    db.raw(versionQuery),
  ]).then((payload: any) =>
    payload.hasOwnProperty("rows") ? payload.rows : payload
  );
  metadata.db_info = {
    dialect: db.client.config.client,
    version: dbVersionRawRows[0].db_version,
  };

  const fields = ["resource_schema", "resource_name", "resource_column_name"];

  const REGEX_LEGAL_SDL = /[0-9a-zA-Z_]+/g;
  const flagNonSupportedSchemaChars = (record) =>
    Object.entries(record).filter(
      ([key, value]) =>
        fields.includes(key) &&
        value.toString().match(REGEX_LEGAL_SDL).length > 1
    ).length > 0;

  const problemResources = dbResourceRawRows.filter(
    flagNonSupportedSchemaChars
  );
  if (!!problemResources.length) {
    logger.fatal(
      {
        summary: "unsupported character breaking GraphqL Schema",
        detail:
          "DB resource name or field contains character unsupported in GraphQL SDL (schema definition language). Supported characters are limited to `[0-9a-zA-Z_]` in all three `fieldsOfConcern`. Review each field within the `problemResources` records. Solutions would include updating the DDL to a name that is supported of omitting the resource from this service via a startup config",
        problemResources,
        fieldsOfConcern: fields,
      },
      STARTUP_FAILED
    );
    process.exit(1);
  }

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

  let geoFields = {};
  if (dbGeometryColumns && mapSchemaResources.public_geometry_columns) {
    const _results = await db.raw(dbGeometryColumns);
    const geoRows = _results.hasOwnProperty("rows") ? _results.rows : _results;

    const fn = (accum, { type, srid, ...curr }) => {
      const resourceName = `${curr.resource_schema}_${curr.resource_name}`;
      if (!accum[resourceName]) {
        accum[resourceName] = {};
      }
      accum[resourceName][curr.resource_column_name] = {
        type,
        srid,
      };
      return accum;
    };

    geoFields = geoRows.reduce(fn, {});
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
        middlewareFn:
          middlewarz && middlewarz[name] ? middlewarz[name] : undefined,
        geoFields: geoFields[name] || undefined,
        supportsReturn,
      }),
    ]
  );

  // build the complex resources based on the provided configs
  (complexResources || []).forEach(
    ({ topResourceName, subResourceName, calculated_fields, group_by }) => {
      // confirm they exist else
      if (!dbResources[topResourceName] || !dbResources[subResourceName]) {
        logger.fatal(
          {
            summary: "bad configuration",
            detail:
              "one of the resources provided for a complexResource does not exist. Make sure both are reflected in the DB as tables, views or materialized views. They must exist at boot so this system can auto generate the appropriate @hapi/joi validators -- which drive all of the REST & GraphQL interfaces (and auto documentation)",
            complex_query: { topResourceName, subResourceName },
          },
          STARTUP_FAILED
        );
        process.exit(1);
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
          geoFields: geoFields[name] || undefined,
          supportsReturn,
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
    metadata,
    supportsReturn,
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
    supportsReturn
  });

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

  return { App, logger, apolloServer };
};
