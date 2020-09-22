import { pascalCase } from "change-case";

import {
  SEARCH_QUERY_CONTEXT,
  SEARCH_QUERY_CONTEXT_DESCRIPTION,
  SEARCH_SUBQUERY_CONTEXT,
  SUPPORTED_OPERATIONS,
  URL_ROOT_SERVICE,
  DEBUG,
  SERVICE_VERSION,
  PIPE,
} from "./const";
import { IValidationExpanderReport } from "./interfaces";

const genSearchParams = (oa3DataSchema, resource) => ([
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
});

// TODO: eval these usages. complexqueries wont be implemented into GraphQL and OpenAPI until this is done
const parseComplexResources = (str) =>
  str.includes(":") ? str.split(":")[0] : str;

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

const NO_BODY_204 = {
  "204": {
    headers: { ...standardHeaders },
    description: `A NO BODY Response as DB does not support returning on CREATE or UPDATE`,
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

const genSearchContextParam = (seperator = PIPE) => (key) => ({
  name: `${seperator}${key}`,
  description: SEARCH_QUERY_CONTEXT_DESCRIPTION[key] || `query context: ${key}`,
  in: "query",
  schema: { type: contextNumbers.includes(key) ? "number" : "string" },
});

const searchContextParams = Object.keys(SEARCH_QUERY_CONTEXT).map(
  genSearchContextParam()
);
const searchSubContextParams = Object.keys(SEARCH_SUBQUERY_CONTEXT).map(
  genSearchContextParam("]")
);
const searchComplexContextParams = [
  ...searchContextParams,
  ...searchSubContextParams,
];

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
export const pathGenerator = (pathPrefix) => (path) => `${pathPrefix}${path}`;

export const genDatabaseResourceOpenApiDocs = async ({
  db,
  st,
  logger,
  metadata,
  debugMode,
  validators,
  dbResources,
  ResourceReports,
  supportsReturn,
  permissions,
}) => {
  const ResourceReportsObject = Object.fromEntries(ResourceReports);

  const genPath = pathGenerator(metadata.routerPrefix);

  // takes input from validators and extends info with dbResources to build details oa3DataSchema
  const oa3DataSchema = ({ resource: _resource, name: _name, type }) => {
    const resource = parseComplexResources(_resource);
    const name = _name.startsWith(">") ? _name.replace(">", "") : _name;

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

  const dbDataTypetoOA3DataType = (dbDataType) => {
    switch (dbDataType) {
      case "integer":
        // ignore numeric and double precision here as they are now strings due to arbitrary precision
        // case "numeric":
        // case "double precision":
        const type = dbDataType === "integer" ? "integer" : "number";
        const format = dbDataType === "double precision" ? "double" : undefined;
        return { type, format };
      default:
        return { type: dbDataType };
    }
  };

  const schemas = { ...ServiceModels };
  const debugRecord: any = {};

  // eventually will need to confirm CRUD ops are enabled
  const paths = ResourceReports.reduce(
    (
      record,
      [resource, { create, read, update, delete: del, search }]: [string, any]
    ) => {
      const isComplexResource = resource.includes(":");
      const subResource = isComplexResource
        ? resource.split(":")[1]
        : undefined;
      const subResourceReport = isComplexResource
        ? ResourceReportsObject[resource.split(":")[1]]
        : undefined;

      const searchEntries = Object.entries(search);
      const searchSubEntries = !isComplexResource
        ? []
        : Object.entries(
            (subResourceReport as IValidationExpanderReport).search
          ).map(([field, info]) => [`>${field}`, info]);
      // need to append `subResource` keys with `>` prefixes here if `isComplexResource`
      // const searchEntriesParams = isComplexResource ? [...searchEntries, ...searchSubEntries] : searchEntries

      const keys = searchEntries.reduce(
        (components, [field, { type, keyComponent }]: any) => [
          ...components,
          ...(keyComponent ? [{ field, type }] : []),
        ],
        []
      );

      const Resource = pascalCase(resource);

      const pathResource = genPath(`${URL_ROOT_SERVICE}/${resource}`);
      const pathResourceRecord = `${pathResource}/record`;

      const parameters = [
        ...searchEntries.map(genSearchParams(oa3DataSchema, resource)),
        ...(isComplexResource
          ? searchSubEntries.map(genSearchParams(oa3DataSchema, subResource))
          : []),

        ...(isComplexResource
          ? searchComplexContextParams
          : searchContextParams),
        ...requestHeaderParams,
      ];

      record[pathResource] = {
        get: {
          summary: `search ${resource}`,
          operationId: `search${Resource}`,
          tags: [Resource],
          parameters,
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

      if (!supportsReturn) {
        record[pathResource].post.responses = NO_BODY_204;
      }

      schemas[Resource] = {
        type: "object",
        // property type could be more specific
        properties: [...record[pathResource].get.parameters]
          .filter((prop) => !prop.name.startsWith(PIPE) && prop.in !== "header") // remove context keys
          .reduce(
            (props, { name, schema }) => ({ ...props, [name]: { ...schema } }),
            {}
          ),
      };

      if (keys.length) {
        const keyComponentParams = keyParams(oa3DataSchema)(keys, resource);

        record[pathResourceRecord] = {};

        record[pathResourceRecord].get = {
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
        record[pathResourceRecord].put = {
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

        if (!supportsReturn) {
          record[pathResourceRecord].put.responses = NO_BODY_204;
        }

        record[pathResourceRecord].delete = {
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

      // no create on views & materialized views
      const nonTableResources = ["view", "materialized view"];
      const nonTableResource = nonTableResources.includes(
        dbResources[resource][searchEntries[0][0]].resource_type
      );
      // seems open-api was configured to not publish routes for keyed URLS if no keys already. must confirm
      if (nonTableResource) {
        delete record[pathResource].post;
        const uniqueRecord = record[pathResourceRecord];
        if (uniqueRecord) {
          delete uniqueRecord.put;
          delete uniqueRecord.delete;
        }
      }

      const debugResponses = {
        ["200"]: {
          description:
            "objects generated by the framework for inspection up until the DB call.",
          content: {
            ["application/json"]: {
              schema: {
                $ref: `#/components/schemas/_debug_resource_response`,
              },
            },
          },
        },
      };

      if (!!debugMode) {
        for (const [url, operations] of Object.entries({ ...record })) {
          const pathChunks = url.split("/");

          const debugPath: string = [
            ...pathChunks.slice(0, 2),
            DEBUG,
            ...pathChunks.slice(3),
          ].join("/");

          const resourceType = pathChunks[2];

          // only want to generate these on the originals.
          // this block is within a loop iterating over all paths
          // and this block adds to the paths -- so we'll be processing our new outputs :-1:

          if (resourceType !== DEBUG) {
            debugRecord[debugPath] = {};
            for (const operation of Object.keys(operations)) {
              const { summary, operationId, ...doc }: any = {
                ...record[url][operation],
              };
              debugRecord[debugPath][operation] = {
                ...doc,
                summary: `debug ${summary}`,
                operationId: `debug_${operationId}`,
                responses: debugResponses,
              };
            }
          }
        }
      }

      return { ...record, ...debugRecord };
    },
    {}
  );

  const {
    name: contactName,
    email: contactEmail,
    url: contactUrl,
    servers,
    ...metaInfo
  } = metadata;
  const metaContact = {
    name: contactName,
    email: contactEmail,
    url: contactUrl,
  };
  // tslint:disable-next-line: no-shadowed-variable
  const metaServers = servers.map((url) => ({ url }));

  const base = {
    openapi: "3.0.0",
    info: {
      version: SERVICE_VERSION,
      title: "Some Service Name",
      description:
        "Super Early (not fully functional yet) description of service resources.",
      termsOfService: "http://swagger.io/terms/",
      contact: {
        name: "Joe Wingard",
        email: "open-source@joewingard.com",
        url: "https://github.com/sudowing/service-engine",
        ...metaContact,
      },
      ...metaInfo,
    },
    servers: metaServers.length
      ? metaServers
      : [{ url: "http://core-service" }],
  };

  const serviceRoutes = {
    "/healthz": {
      get: {
        summary: "heathcheck resource",
        operationId: "ping",
        tags: ["_service"],
        responses: {
          "200": {
            headers: {
              "x-request-id": {
                schema: {
                  type: "string",
                },
                description:
                  "uuid issued to each request. Injected into all server logs. useful for debugging",
              },
            },
            description: "heathcheck resource",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/openapi": {
      get: {
        summary: "openapi json",
        operationId: "openapi",
        tags: ["_service"],
        parameters: [
          {
            name: "debug",
            description: "include debug routes (disabled by default)",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            headers: {
              "x-request-id": {
                schema: {
                  type: "string",
                },
                description:
                  "uuid issued to each request. Injected into all server logs. useful for debugging",
              },
            },
            description: "A paged array of Account Records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/resources": {
      get: {
        summary:
          "resources available in service (resource & CRUD + Search Operations)",
        operationId: "resources",
        tags: ["_service"],
        responses: {
          "200": {
            headers: {
              "x-request-id": {
                schema: {
                  type: "string",
                },
                description:
                  "uuid issued to each request. Injected into all server logs. useful for debugging",
              },
            },
            description: "blah blah blah",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/db_resources": {
      get: {
        summary: "db resources available in service (tables, views, mat views)",
        operationId: "dbResources",
        tags: ["_service"],
        parameters: [
          {
            name: "resource",
            description:
              "name of single db resource (table/view/materialized view)",
            in: "query",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            headers: {
              "x-request-id": {
                schema: {
                  type: "string",
                },
                description:
                  "uuid issued to each request. Injected into all server logs. useful for debugging",
              },
            },
            description: "A paged array of Account Records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/db_resources/raw": {
      get: {
        summary: "db resources available in service",
        operationId: "dbResourcesRaw",
        tags: ["_service"],
        responses: {
          "200": {
            headers: {
              "x-request-id": {
                schema: {
                  type: "string",
                },
                description:
                  "uuid issued to each request. Injected into all server logs. useful for debugging",
              },
            },
            description: "A paged array of Account Records",
          },
        },
      },
    },
  };

  return {
    components: { schemas },
    paths: { ...paths, ...serviceRoutes },
    ...base,
  };
};
