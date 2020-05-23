import { pascalCase } from "change-case";

import { REGEX_CHAR } from './const';

//   // this has other uses -- needs to be isolated
//   const resources = Object.entries(
//     validators
//   ).map(([name, validator]: ts.TDatabaseResources) => [
//     name,
//     new clss.Resource({ db, st, logger, name, validator }).report,
//   ]);

export const toSchemaScalar = (type: string) => {
    switch (type) {
        case "boolean":
        return 'Boolean';
        case "character":
        case "character varying":
        case "character varying(255)":
        case "text":
        case "name":
        case "smallint[]":
        case "timestamp without time zone":
        case "timestamp with time zone":
        case "uuid":
            return 'String';
        case "integer":
        case "smallint":
        case "double precision":
        case "numeric":
            return 'Float';
        default:
            const match = type.match(REGEX_CHAR);
            if (match) {
                return 'String';
            }

            throw new Error(`unknown type ${type}`);
    }
};

export const gqlTypes = (dbResources) => {
    const schema = {
        query: [],
        mutate: []
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
                context: inputContext
                where: in${ResourceName}
            ): [${ResourceName}!]
            Read${ResourceName}(
                where: keys${ResourceName}!
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
    const {query, mutate, ...other} = gqlTypes(dbResources);
    const items = Object.entries(other).map(([name, definition]) => `
        ${name} {
            ${definition.join(ln)}
        }
    `);

    return`
        type Query {
            ${query.join(ln)}
        }

        ${items.join(ln)}
    `;
}