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

// [...qqqqq(keys), ...Object.entries(read)
//     .map(([name, {type, required, keyComponent, geoqueryType, softDeleteFlag, updateDisabled, createRequired, createDisabled}]: any) => ({
//     name,
//     description: name,
//     in: 'query',
//     required,
//     schema: { type }
//     })



export const genDatabaseResourceOpenApiDocs = (reports) => {
    const alpha = Object.entries(reports);

    const models = [];

    const paths = alpha.reduce((record, [resource, {create, read, update, delete: del, search}]: [string, any]) => {

        const keys = Object.entries(search).reduce((components, [field, {type, keyComponent}]: any) =>
            [...components, ...(keyComponent ? [{field, type}] : [])], []);

        const Resource = pascalCase(resource);


        const path = `/${resource}`;
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
                        description: `A paged array of ${resource}`,
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/${Resource}`
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
                        in: 'body',
                        required,
                        schema: { type }
                    })),
                responses: {
                    '200': {
                        description: `A paged array of ${resource}`,
                        content: {
                            'application/json': {
                                schema: {
                                    '$ref': `#/components/schemas/${Resource}`
                                }
                            }
                        }
                    }
                }
            },
        };


        models.push([Resource, {
            type: 'object',
            properties: record[path].get.parameters.reduce((props, {name, schema: type}) => ({ ...props, [name]: {type}}), {})
        }]);


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
                        description: `A paged array of ${resource}`,
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
                        description: `A paged array of ${resource}`,
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
                        description: `A paged array of ${resource}`,
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


//     default:
//       description: unexpected error
//       content:
//         application/json:
//           schema:
//             $ref: "#/components/schemas/Error"

    }, {});

    return {models, paths}


}

