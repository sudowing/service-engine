import { pascalCase } from "change-case";
import { GraphQLModule } from "@graphql-modules/core";
import gql from "graphql-tag";

import { REGEX_CHAR } from "./const";

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

    // for (const [field, record] of Object.entries(dbResources[name])) {
    //     const {notnull, type, primarykey}: any = record;
    //     const schemaScalar = toSchemaScalar(type);

    //     schema[`input in${ResourceName}`].push(`${field}: ${schemaScalar}`);

    //     schema[`type ${ResourceName}`].push(`${field}: ${schemaScalar}${notnull ? '!' : ''}`);
    //     if (primarykey) {
    //         schema[`input keys${ResourceName}`].push(`${field}: ${schemaScalar}`);
    //     }
    // }

    // schema.query.push(`
    //     Search${ResourceName}(
    //         context: inputContext
    //         where: in${ResourceName}
    //     ): [${ResourceName}!]
    //     Read${ResourceName}(
    //         where: keys${ResourceName}!
    //     ): ${ResourceName}
    // `);
    // schema.mutation.push(`
    //     Create${ResourceName}(
    //         context: inputContext
    //         where: ${ResourceName}
    //     ): [${ResourceName}!]
    //     Update${ResourceName}(
    //         where: keys${ResourceName}!
    //     ): ${ResourceName}
    //     Delete${ResourceName}(
    //         where: keys${ResourceName}!
    //     ): ${ResourceName}
    // `);
  }
  return schema;
};
// const ln = `
// `;

export const gqlSchema = async ({
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
}) => {
  // const {query, mutation, ...other} = gqlTypes(dbResources);
  // const items = Object.entries(other).map(([name, definition]) => `
  //     ${name} {
  //         ${definition.join(ln)}
  //     }
  // `);

  const typeDefsString = `
        type Query {
            ping: AppPing
        }
        type AppPing {
            timestamp: Float
            message: String
        }
    `;

  return {
    typeDefsString,
    typeDefs: gql(typeDefsString),
  };

  // return`
  //     type Query {
  //         ${query.join(ln)}
  //     }
  //     type Mutation {
  //         ${mutation.join(ln)}
  //     }

  //     ${items.join(ln)}
  // `;
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

  const resolvers = {
    Query: {
      ping(obj, args, context, info) {
        return {
          timestamp: Date.now(),
          message: "go braves",
        };
      },
    },
    AppPing: {
      timestamp(obj, args, context, info) {
        return obj.timestamp;
      },
      message(obj, args, context, info) {
        return obj.message;
      },
    },
  };

  const AppModule = new GraphQLModule({
    typeDefs,
    resolvers,
  });

  return {
    AppModule,
    typeDefsString,
  };
};
