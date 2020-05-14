import {
    pascalCase,
  } from "change-case";

import {
    SEARCH_QUERY_CONTEXT, SEARCH_QUERY_CONTEXT_DESCRIPTION
    // , SUPPORTED_OPERATIONS, DEFINED_ARG_LENGTHS
} from './const';


export const standardHeaders = {
    'x-request-id': {
      schema: {
        type: 'string',
      },
      description: 'uuid issued to each request. Injected into all server logs. useful for debugging',
    },
    'x-count': {
      schema: {
        type: 'string',
      },
      description: 'full count of all records that meet query criteria (omitting any pagiation specs). useful for rendering pagiation limits without making another service call.',
    },
    'x-sql': {
      schema: {
        type: 'string',
      },
      description: 'plaintext SQL used to complete db transaction.',
    },
};

const contextNumbers = ['page', 'limit'];

const searchContextParams = Object.keys(SEARCH_QUERY_CONTEXT)
    .map(key => ({
        name: `|${key}`,
        description: SEARCH_QUERY_CONTEXT_DESCRIPTION[key] || `query context: ${key}`,
        in: 'query',
        schema: { type: contextNumbers.includes(key) ? 'number': 'string' }
    }));

export const keyParams = (input: {
    key: string,
    type: string,
}[]) => input.map(({key: name, type}) => ({
    name,
    description: name,
    in: 'query',
    required: true,
    schema: { type }
}));

export const ServiceModels = {
    '_service_count': {
        type: 'object',
        properties: {
            count: {
                type: 'number'
            }
        }
    }
};

export const genDatabaseResourceOpenApiDocs = (reports) => {
    const alpha = Object.entries(reports);

    const schemas = {...ServiceModels};

    const paths = alpha.reduce((record, [resource, {create, read, update, delete: del, search}]: [string, any]) => {

        const keys = Object.entries(search).reduce((components, [field, {type, keyComponent}]: any) =>
            [...components, ...(keyComponent ? [{field, type}] : [])], []);

        const Resource = pascalCase(resource);

        const path = `/service/${resource}`;
        record[path] = {
            get: {
                summary: `search ${resource}`,
                operationId: `search${Resource}`,
                tags: [Resource],
                parameters: [
                    ...Object.entries(search)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                        name,
                        description: name,
                        in: 'query',
                        required,
                        schema: { type }
                    })),
                    ...searchContextParams,
                ],
                responses: {
                    '200': {
                        headers: {...standardHeaders},
                        description: `A paged array of ${Resource} Records`,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        '$ref': `#/components/schemas/${Resource}`
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: `create ${resource}`,
                operationId: `create${Resource}`,
                tags: [Resource],
                requestBody: {
                    description: `Single ${Resource} or array of ${Resource}`,
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: {
                                    '$ref': `#/components/schemas/${Resource}`
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        headers: {...standardHeaders},
                        description: `A ${Resource} Record`,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        '$ref': `#/components/schemas/${Resource}`
                                    }
                                }
                            }
                        }
                    }
                }
            },
        };


        schemas[Resource] = {
            type: 'object',
            // property type could be more specific
            properties: record[path].get.parameters.reduce((props, {name, schema: {type}}) =>
                ({ ...props, [name]: {type}}), {})
        };

        if (keys.length) {
            const keyComponentParams = keyParams(keys);


            record[`${path}/record`] = {};

            record[`${path}/record`].get = {
                summary: `read ${resource}`,
                operationId: `read${Resource}`,
                tags: [Resource],
                parameters: keyComponentParams,
                responses: {
                    '200': {
                        headers: {...standardHeaders},
                        description: `A ${Resource} Record`,
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/${Resource}`
                                }
                            }
                        }
                    }
                }
            };
            record[`${path}/record`].put = {
                summary: `update ${resource}`,
                operationId: `update${Resource}`,
                tags: [Resource],
                parameters: keyComponentParams,


                requestBody: {
                    description: `Single ${Resource}`,
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                '$ref': `#/components/schemas/${Resource}`                            }
                        }
                    }
                },

                responses: {
                    '200': {
                        headers: {...standardHeaders},
                        description: `A ${Resource} Record`,
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/${Resource}`
                                }
                            }
                        }
                    }
                }
            };
            record[`${path}/record`].delete = {
                summary: `delete ${resource}`,
                operationId: `delete${Resource}`,
                tags: [Resource],
                parameters: keyComponentParams,

                responses: {
                    '200': {
                        headers: {...standardHeaders},
                        description: `A ${Resource} Record`,
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/_service_count`
                                }
                            }
                        }
                    }
                }
            };
        }




        return record;


    }, {});

    const base = {
        openapi: "3.0.0",
        info: {
          version: '1.0.0',
          title: 'American Hunt Service Resources',
          description: 'Super Early (not fully functional yet) description of service resources.',
          termsOfService: 'http://swagger.io/terms/',
          contact: {
            name: 'Joe Wingard',
            email: 'joe@email.com',
            url: 'http://soccer-moms-with-guns.io',
          },
          license: {
            name: 'Apache 2.0',
            url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
          },
        },
        servers: [{url: 'http://core-service'}],
    }













    return {components: {schemas}, paths, ...base}


}

