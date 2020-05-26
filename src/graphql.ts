import { pascalCase } from "change-case";
import { GraphQLModule } from "@graphql-modules/core";
import gql from "graphql-tag";
import * as graphqlFields from "graphql-fields";
import GraphQLJSON from "graphql-type-json";
import { UserInputError } from "apollo-server-koa";

import { v4 as uuidv4 } from "uuid";

import { HEADER_REQUEST_ID, REGEX_CHAR } from "./const";
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
    schema[`input input${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
      const { notnull, type, primarykey }: any = record;
      const schemaScalar = toSchemaScalar(type);

      schema[`input in${ResourceName}`].push(`${field}: ${schemaScalar}`);

      schema[`type ${ResourceName}`].push(
        `${field}: ${schemaScalar}${notnull ? "!" : ""}`
      );

      schema[`input input${ResourceName}`].push(
        `${field}: ${schemaScalar}${notnull ? "!" : ""}`
      );
      if (primarykey) {
        schema[`input keys${ResourceName}`].push(`${field}: ${schemaScalar}`);
      }
    }

    schema.query.push(`
        Search${ResourceName}(
            payload: in${ResourceName}
            context: inputContext
            options: serviceInputOptions
        ): resSearch${ResourceName}
        Read${ResourceName}(
            payload: keys${ResourceName}!
        ): resRead${ResourceName}
    `);
    schema.mutation.push(`
        Create${ResourceName}(
            payload: input${ResourceName}
        ): resCreate${ResourceName}
        Update${ResourceName}(
            payload: keys${ResourceName}!
        ): resUpdate${ResourceName}
        Delete${ResourceName}(
            payload: keys${ResourceName}!
        ): resDelete${ResourceName}
    `);

    schema[`type resCreate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: [${ResourceName}]
      `;

    schema[`type resRead${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: ${ResourceName}
      `;

    schema[`type resUpdate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: [${ResourceName}]
      `;

    schema[`type resDelete${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: Float
      `;

    schema[`type resSearch${ResourceName}`] = `
          sql: String
          debug: JSONB
          count: Float
          data: [${ResourceName}]
      `;
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
  const { query, mutation, ...other } = gqlTypes(dbResources);
  const items = Object.entries(other).map(
    ([name, definition]) => `
      ${name} {
          ${Array.isArray(definition) ? definition.join(ln) : definition}
      }
    `
  );

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


        input serviceInputOptions {
          count: Boolean
        }
        type serviceResponseBase {
          count: Float
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

const apiType = "GRAPHQL";
export const makeServiceResolver = (resource) => (operation: string) => async (
  obj,
  args,
  ctx,
  info
) => {
  const reqId = ctx.reqId || "reqId no issued";
  const defaultInput = { payload: {}, context: {}, options: {} };

  const input = { ...defaultInput, ...args };
  const { payload, context, options } = input;

  // because I'm now publishing request metadata (debug, sql, count) with records the value of record/records key
  // cant use this
  // const fields = Object.keys(graphqlFields(info));
  // context.fields = fields;

  const serviceResponse = resource[operation]({
    payload,
    context,
    reqId,
    apiType,
  });

  if (serviceResponse.result) {
    try {
      const sql = serviceResponse.result.sql.toString();
      const data = await serviceResponse.result.sql;

      // update & delete will one day support search query for bulk mutation (already supported in the class I think)
      const singleRecord = ["read", "update", "delete"].includes(operation);

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
      const response: IServiceResolverResponse = {
        data: singleRecord ? (data.length ? data[0] : null) : data,
        sql,
        debug,
      };

      if (options.count) {
        const { result: searchCountResult } = resource[operation]({
          payload,
          reqId,
          apiType,
        });

        const sqlSearchCount = resource.db.from(
          resource.db.raw(`(${searchCountResult.sql.toString()}) as main`)
        );
        // this is needed to make the db result mysql/postgres agnostic
        sqlSearchCount.count("* as count");

        const [{ count }] = await sqlSearchCount; // can/should maybe log this
        response.count = count;
      }

      return response;

      // if single record searched and not returned -- 404
      // if ([null, undefined].includes(output)) {
    } catch (err) {
      // log error && // not a user input error
      throw new UserInputError("cnst.INTERNAL_SERVER_ERROR", {
        detail: serviceResponse,
        reqId,
      });
    }
  } else {
    throw new UserInputError("HTTP_STATUS.BAD_REQUEST", {
      detail: serviceResponse,
      reqId,
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

  const serviceResolvers = Resources.reduce(
    ({ Query, Mutation }, [name, resource]) => {
      const ResourceName = pascalCase(name);
      const resolver = makeServiceResolver(resource);
      return {
        Query: {
          ...Query,
          [`Read${ResourceName}`]: resolver("read"),
          [`Search${ResourceName}`]: resolver("search"),
        },
        Mutation: {
          ...Mutation,
          [`Create${ResourceName}`]: resolver("create"),
          [`Update${ResourceName}`]: resolver("update"),
          [`Delete${ResourceName}`]: resolver("delete"),
        },
      };
    },
    { Query: {}, Mutation: {} }
  );

  const appResolvers = {
    JSONB: GraphQLJSON,
    Query: {
      service_ping(obj, args, context, info) {
        const fields = Object.keys(graphqlFields(info));
        return {
          timestamp: Date.now(),
          message: "go braves",
          wip: { fields },
        };
      },
    },
  };

  const AppModule = new GraphQLModule({
    typeDefs,
    resolvers: [appResolvers, serviceResolvers],
    context({ ctx }) {
      const reqId = uuidv4();
      ctx.response.set(HEADER_REQUEST_ID, reqId);
      return {
        reqId,
      };
    },
  });

  return {
    AppModule,
    typeDefsString,
  };
};
