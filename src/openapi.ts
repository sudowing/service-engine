import {
    pascalCase,
  } from "change-case";

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

export const genDatabaseResourceOpenApiDocs = (reports) => {
    const alpha = Object.entries(reports);

    const schemas = {};

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
                parameters: Object.entries(search)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                        name,
                        description: name,
                        in: 'query',
                        required,
                        schema: { type }
                    })),
                responses: {
                    '200': {
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
                parameters: Object.entries(create)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                        name,
                        description: name,
                        in: 'query',
                        required,
                        schema: { type }
                    })),

                requestBody: {
                    description: `Optional description in *Markdown*`,
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
            record[`${path}/record`] = {};

            record[`${path}/record`].get = {
                summary: `read ${resource}`,
                operationId: `read${Resource}`,
                tags: [Resource],
                parameters: [...keyParams(keys), ...Object.entries(read)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                    name,
                    description: name,
                    in: 'query',
                    required,
                    schema: { type }
                    }))],
                responses: {
                    '200': {
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
                parameters: [...keyParams(keys), ...Object.entries(update)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                        name,
                        description: name,
                        in: 'body',
                        required,
                        schema: { type }
                    }))],
                responses: {
                    '200': {
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
                parameters: [...keyParams(keys), ...Object.entries(del)
                    .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
                        name,
                        description: name,
                        in: 'body',
                        required,
                        schema: { type }
                    }))],
                responses: {
                    '200': {
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

