import { pascalCase } from "change-case";
import { GraphQLModule } from "@graphql-modules/core";
import gql from "graphql-tag";
import * as graphqlFields from "graphql-fields";
import GraphQLJSON from "graphql-type-json";
import { UserInputError } from "apollo-server-koa";

import { REGEX_CHAR } from "./const";
import { IServiceResolverResponse } from "./interfaces";

export const toSchemaScalar = (type: string) => {
  switch (type) {
    case "boolean":
      return "Boolean";
    case "character":
    case "character varying":
    case "character varying(255)":
    case "text":
    case "name":
    case "smallint[]":
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "uuid":
      return "String";
    case "integer":
    case "smallint":
    case "double precision":
    case "numeric":
      return "Float";
    default:
      const match = type.match(REGEX_CHAR);
      if (match) {
        return "String";
      }

      throw new Error(`unknown type ${type}`);
  }
};

export const gqlTypes = (dbResources) => {
  const schema = {
    query: [],
    mutation: [],
  };
  for (const name of Object.keys(dbResources)) {
    const ResourceName = pascalCase(name);
    schema[`type ${ResourceName}`] = [];
    schema[`input keys${ResourceName}`] = [];
    schema[`input in${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
        const {notnull, type, primarykey}: any = record;
        const schemaScalar = toSchemaScalar(type);

        schema[`input in${ResourceName}`].push(`${field}: ${schemaScalar}`);

        schema[`type ${ResourceName}`].push(`${field}: ${schemaScalar}${notnull ? '!' : ''}`);
        if (primarykey) {
            schema[`input keys${ResourceName}`].push(`${field}: ${schemaScalar}`);
        }
    }

    schema.query.push(`
        Search${ResourceName}(
            payload: in${ResourceName}
            context: inputContext
            options: serviceOptions
        ): [${ResourceName}!]
        Read${ResourceName}(
            payload: keys${ResourceName}!
            context: inputContext
            options: serviceOptions
        ): ${ResourceName}
    `);
    schema.mutation.push(`
        Create${ResourceName}(
            payload: ${ResourceName}
            context: inputContext
            options: serviceOptions
        ): [${ResourceName}!]
        Update${ResourceName}(
            payload: keys${ResourceName}!
            context: inputContext
            options: serviceOptions
        ): ${ResourceName}
        Delete${ResourceName}(
            payload: keys${ResourceName}!
            context: inputContext
            options: serviceOptions
        ): ${ResourceName}
    `);
  }
  return schema;
};
const ln = `
`;

export const gqlSchema = async ({
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
}) => {
  const {query, mutation, ...other} = gqlTypes(dbResources);
  const items = Object.entries(other).map(([name, definition]) => `
      ${name} {
          ${definition.join(ln)}
      }
  `);

  const typeDefsString = `
        type Query {
            service_ping: serviceAppPing
            ${query.join(ln)}
        }
        type Mutation {
            ${mutation.join(ln)}
        }

        type serviceAppPing {
            timestamp: Float
            message: String
            wip: JSONB
        }


        input inputContext {
          seperator: String
          notWhere: Boolean
          statementContext: String
          orderBy: [String!]
          page: Float
          limit: Float
        }


        type serviceOptions {
          sql: Boolean
          debug: Boolean
        }
        type serviceResponseBase {
          count: Number
          sql: String
          debug: JSONB
        }

        scalar serviceCoordinates

        type servicePointGeometry {
            type: String!
            coordinates: serviceCoordinates!
        }

        # these are for jsonb cases where you do not care to fully type
        scalar JSONB

        ${items.join(ln)}

    `;

  return {
    typeDefsString,
    typeDefs: gql(typeDefsString),
  };
};


export const makeServiceResolver = (db) => (resourceOperation) =>
async (obj, args, ctx, info) => {
  const {reqId} = ctx;

  const { payload, context, options } = args;

  const fields = Object.keys(graphqlFields(info));
  context.fields = fields;

  const serviceResponse = resourceOperation({
    payload,
    context,
    reqId,
  });

  if (serviceResponse.result) {
    try{

          const sql = serviceResponse.result.sql.toString();
          const data = await serviceResponse.result.sql;
          delete serviceResponse.result.sql;
          const debug = {
            now: Date.now(),
            reqId,
            input: {
              payload,
              context,
              options,
            },
            serviceResponse,
          };

          // send count as additional field
          const response: IServiceResolverResponse = {data, sql, debug}

          if (options.count) {
            const { result: searchCountResult } = resourceOperation({
              payload,
              reqId,
            });

            const sqlSearchCount = db.from(
              db.raw(`(${searchCountResult.sql.toString()}) as main`)
            );
            // this is needed to make the db result mysql/postgres agnostic
            sqlSearchCount.count("* as count");

            const [{ count }] = await sqlSearchCount; // can/should maybe log this
            response.count = count;
          }

          return response;

          // if single record searched and not returned -- 404
          // if ([null, undefined].includes(output)) {


    }













    catch(err){
      // log error && // not a user input error
      throw new UserInputError('cnst.INTERNAL_SERVER_ERROR', {
          detail: serviceResponse,
          reqId
      });
    }

  } else {
    throw new UserInputError('HTTP_STATUS.BAD_REQUEST', {
      detail: serviceResponse,
      reqId
    });
  }

};

export const gqlModule = async ({
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
}) => {
  const { typeDefsString, typeDefs } = await gqlSchema({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
  });

  const serviceResolvers = Resources.reduce(({Query, Mutation}, [name, resource]) => {
    const ResourceName = pascalCase(name);
    const resolver = makeServiceResolver(resource.db);
    return {
      Query: {
        ...Query,
        [`Read${ResourceName}`]: resolver(resource.read),
        [`Search${ResourceName}`]: resolver(resource.search),
      },
      Mutation: {
        ...Mutation,
        [`Create${ResourceName}`]: resolver(resource.create),
        [`Update${ResourceName}`]: resolver(resource.update),
        [`Delete${ResourceName}`]: resolver(resource.delete),
      },
    };
  }, {Query: {}, Mutation: {}});

  const appResolvers = {
    JSONB: GraphQLJSON,
    Query: {
      service_ping(obj, args, context, info) {
        const fields = Object.keys(graphqlFields(info));
        return {
          timestamp: Date.now(),
          message: "go braves",
          wip: {fields}
        };
      },
    },
    // AppPing: {
    //   timestamp(obj, args, context, info) {
    //     return obj.timestamp;
    //   },
    //   message(obj, args, context, info) {
    //     return obj.message;
    //   },
    // },
  };

  const AppModule = new GraphQLModule({
    typeDefs,
    resolvers: [appResolvers, serviceResolvers],
  });

  return {
    AppModule,
    typeDefsString,
  };
};
