import { pascalCase } from "change-case";

import * as clss from "./class";
import {
  SEARCH_QUERY_CONTEXT,
  SEARCH_QUERY_CONTEXT_DESCRIPTION,
  SUPPORTED_OPERATIONS,
} from "./const";
import * as ts from "./interfaces";
import { genDatabaseResourceValidators } from "./queries";

const urlRootService = "/service";
const urlRootDebug = "/debug";

export const standardHeaders = {
  "x-request-id": {
    schema: {
      type: "string",
    },
    description:
      "uuid issued to each request. Injected into all server logs. useful for debugging",
  },
  "x-sql": {
    schema: {
      type: "string",
    },
    description: "plaintext SQL used to complete db transaction.",
  },
};

const requestHeaders = {
  "x-get-count": {
    in: "header",
    schema: {
      type: "string",
    },
  },
  "x-get-sql": {
    in: "header",
    schema: {
      type: "string",
    },
  },
};
const requestHeaderParams = Object.entries(requestHeaders).map(
  ([name, deff]) => ({
    name,
    ...deff,
    description: SEARCH_QUERY_CONTEXT_DESCRIPTION[name] || "",
  })
);

export const searchHeaders = {
  ...standardHeaders,
  "x-count": {
    schema: {
      type: "string",
    },
    description:
      "full count of all records that meet query criteria (omitting any pagiation specs). useful for rendering pagiation limits without making another service call.",
  },
};

const contextNumbers = ["page", "limit"];

const searchContextParams = Object.keys(SEARCH_QUERY_CONTEXT).map((key) => ({
  name: `|${key}`,
  description: SEARCH_QUERY_CONTEXT_DESCRIPTION[key] || `query context: ${key}`,
  in: "query",
  schema: { type: contextNumbers.includes(key) ? "number" : "string" },
}));

// almost certainly a better way to do this
export const fieldsContext = searchContextParams.filter(
  ({ name }) => name === "|fields"
)[0];

export const keyParams = (fn) => (
  input: {
    field: string;
    type: string;
  }[],
  resource: string
) =>
  input.map(({ field: name, type }) => ({
    name,
    description: name,
    in: "query",
    required: true,
    schema: fn({ resource, name, type }),
  }));

export const ServiceModels = {
  _service_count: {
    type: "object",
    properties: {
      count: {
        type: "number",
      },
    },
  },
  _search_interfaces: {
    type: "object",
    // property type could be more specific
    properties: Object.keys(SUPPORTED_OPERATIONS).reduce(
      (props, key) => ({ ...props, [`field.${key}`]: { type: "string" } }),
      {}
    ),
  },
  _debug_resource_response: {
    type: "object",
    properties: {
      payload: { type: "object" },
      context: { type: "object" },
      requestId: { type: "string" },
      searchQuery: { type: "object", nullable: true },
      hardDelete: { type: "boolean", nullable: true },
      sql: { type: "string" },
    },
  },
};

// SUPPORTED_OPERATIONS, DEFINED_ARG_LENGTHS

export const genDatabaseResourceOpenApiDocs = async ({ db, st, logger }) => {
  const { validators, dbResources } = await genDatabaseResourceValidators({
    db,
  });

  // this has other uses -- needs to be isolated
  const resources = Object.entries(
    validators
  ).map(([name, validator]: ts.TDatabaseResources) => [
    name,
    new clss.Resource({ db, st, logger, name, validator }).report,
  ]);

  // takes input from validators and extends info with dbResources to build details oa3DataSchema
  const oa3DataSchema = ({ resource, name, type }) => {
    // need to handled cases like UUID, dates and other things that are populated in the DBs
    const nullable = dbResources[resource][name].notnull ? undefined : true;

    let newType = { type, nullable };

    if (type === "number") {
      newType = {
        ...newType,
        ...dbDataTypetoOA3DataType(dbResources[resource][name].type),
      };
    }

    return newType;
  };

  // type 	format 	Description
  // number 	– 	Any numbers.
  // number 	float 	Floating-point numbers.
  // number 	double 	Floating-point numbers with double precision.
  // integer 	– 	Integer numbers.
  // integer 	int32 	Signed 32-bit integers (commonly used integer type).
  // integer 	int64 	Signed 64-bit integers (long type).
  const dbDataTypetoOA3DataType = (dbDataType) => {
    switch (dbDataType) {
      case "numeric":
      case "integer":
      case "double precision":
        const type = dbDataType === "integer" ? "integer" : "number";
        const format = dbDataType === "double precision" ? "double" : undefined;
        return { type, format };
      default:
        return { type: dbDataType };
    }
  };
  // type: string;
  // required: boolean;
  // keyComponent: boolean;
  // geoqueryType: null | string;
  // softDeleteFlag: boolean;
  // updateDisabled: boolean;
  // createRequired: boolean;
  // createDisabled: boolean;

  const schemas = { ...ServiceModels };

  // eventually will need to confirm CRUD ops are enabled
  const paths = resources.reduce(
    (
      record,
      [resource, { create, read, update, delete: del, search }]: [string, any]
    ) => {
      const searchEntries = Object.entries(search);

      const keys = searchEntries.reduce(
        (components, [field, { type, keyComponent }]: any) => [
          ...components,
          ...(keyComponent ? [{ field, type }] : []),
        ],
        []
      );

      const Resource = pascalCase(resource);

      const path = `${urlRootService}/${resource}`;
      record[path] = {
        get: {
          summary: `search ${resource}`,
          operationId: `search${Resource}`,
          tags: [Resource],
          parameters: [
            ...searchEntries.map(
              ([
                name,
                {
                  type,
                  required,
                  keyComponent,
                  geoqueryType,
                  softDeleteFlag,
                  updateDisabled,
                  createRequired,
                  createDisabled,
                },
              ]: any) => ({
                name,
                description: name,
                in: "query",
                required,
                schema: oa3DataSchema({ resource, name, type }),
              })
            ),
            ...searchContextParams,
            ...requestHeaderParams,
          ],
          responses: {
            "200": {
              headers: { ...searchHeaders },
              description: `A paged array of ${Resource} Records`,
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: `#/components/schemas/${Resource}`,
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: `create ${resource}`,
          operationId: `create${Resource}`,
          tags: [Resource],
          parameters: [fieldsContext],

          requestBody: {
            description: `Single ${Resource} or array of ${Resource}`,
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/${Resource}`,
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              headers: { ...standardHeaders },
              description: `A ${Resource} Record`,
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: `#/components/schemas/${Resource}`,
                    },
                  },
                },
              },
            },
          },
        },
      };

      schemas[Resource] = {
        type: "object",
        // property type could be more specific
        properties: [...record[path].get.parameters]
          .filter((prop) => !prop.name.startsWith("|") && prop.in !== "header") // remove context keys
          .reduce(
            (props, { name, schema }) => ({ ...props, [name]: { ...schema } }),
            {}
          ),
      };

      if (keys.length) {
        const keyComponentParams = keyParams(oa3DataSchema)(keys, resource);

        record[`${path}/record`] = {};

        record[`${path}/record`].get = {
          summary: `read ${resource}`,
          operationId: `read${Resource}`,
          tags: [Resource],
          parameters: [...keyComponentParams, fieldsContext],
          responses: {
            "200": {
              headers: { ...standardHeaders },
              description: `A ${Resource} Record`,
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/${Resource}`,
                  },
                },
              },
            },
          },
        };
        record[`${path}/record`].put = {
          summary: `update ${resource}`,
          operationId: `update${Resource}`,
          tags: [Resource],
          parameters: [...keyComponentParams, fieldsContext],

          requestBody: {
            description: `Single ${Resource}`,
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${Resource}`,
                },
              },
            },
          },

          responses: {
            "200": {
              headers: { ...standardHeaders },
              description: `A ${Resource} Record`,
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/${Resource}`,
                  },
                },
              },
            },
          },
        };
        record[`${path}/record`].delete = {
          summary: `delete ${resource}`,
          operationId: `delete${Resource}`,
          tags: [Resource],
          parameters: [...keyComponentParams],

          responses: {
            "200": {
              headers: { ...standardHeaders },
              description: `A ${Resource} Record`,
              content: {
                "application/json": {
                  schema: {
                    $ref: `#/components/schemas/_service_count`,
                  },
                },
              },
            },
          },
        };
      }

      const debugResponses = {
        ["200"]: {
          content: {
            ["application/json"]: {
              schema: {
                $ref: `#/components/schemas/_debug_resource_response`,
              },
            },
          },
        },
      };

      Object.entries(record).forEach(([url, operations]) => {
        record[url.replace(urlRootService, urlRootDebug)] = Object.keys(
          operations
        ).reduce(
          (newOperations, operation) => ({
            ...newOperations,
            [operation]: {
              ...record[url][operation],
              summary: `debug ${record[url][operation].summary} (no db call)`,
              operationId: `debug_${record[url][operation].operationId}`,
              // tags: ['debug'],
              responses: debugResponses,
            },
          }),
          {}
        );

        // console.log('add debug stuff ', url.replace(urlRootService, urlRootDebug), Object.keys(operations));
      });

      // _debug_resource_response

      return record;
    },
    {}
  );

  const base = {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "American Hunt Service Resources",
      description:
        "Super Early (not fully functional yet) description of service resources.",
      termsOfService: "http://swagger.io/terms/",
      contact: {
        name: "Joe Wingard",
        email: "joe@email.com",
        url: "http://soccer-moms-with-guns.io",
      },
      license: {
        name: "Apache 2.0",
        url: "https://www.apache.org/licenses/LICENSE-2.0.html",
      },
    },
    servers: [{ url: "http://core-service" }],
  };

  return { dbResources, components: { schemas }, paths, ...base };
};