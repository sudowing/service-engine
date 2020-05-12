import * as ts from "./interfaces";


export const getDatabaseResourcesRaw = ({db}: ts.IDatabaseBootstrap) => {

    // tslint:disable-next-line: no-console
    console.log((db as any).client.config.client);

    const sql = `
        select
        f.attnum AS num,
        c.relname as table_name,
        f.attname AS column_name,
        f.attnum,
        f.attnotnull AS notnull,
        pg_catalog.format_type(f.atttypid,f.atttypmod) AS type,
        CASE
            WHEN p.contype = 'p' THEN 't'
            ELSE 'f'
        END AS primarykey,
        CASE
            WHEN p.contype = 'u' THEN 't'
            ELSE 'f'
        END AS uniquekey,
        CASE
            WHEN p.contype = 'f' THEN g.relname
        END AS foreignkey,
        CASE
            WHEN p.contype = 'f' THEN p.confkey
        END AS foreignkey_fieldnum,
        CASE
            WHEN p.contype = 'f' THEN g.relname
        END AS foreignkey,
        CASE
            WHEN p.contype = 'f' THEN p.conkey
        END AS foreignkey_connnum
    FROM pg_attribute f
        JOIN pg_class c ON c.oid = f.attrelid
        JOIN pg_type t ON t.oid = f.atttypid
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = f.attnum
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_constraint p ON p.conrelid = c.oid AND f.attnum = ANY (p.conkey)
        LEFT JOIN pg_class AS g ON p.confrelid = g.oid
    WHERE c.relkind = 'r'::char
        AND n.nspname = 'public'  -- Replace with Schema name
        AND f.attnum > 0
    order by
        c.relname asc,
        f.attnum asc,
        f.attname asc
    `;

    return sql;

}



export const joiKeyComponent = (keyComponent: boolean) =>
    keyComponent
        ? `.invalid(engine.SYMBOL_UNIQUE_KEY_COMPONENT)`
        : ``;

export const joiRequired = (required: boolean) =>
    required ? `.required()` : ``;

const REGEX_CHAR = /character\((?<len>\d)\)/;

export const joiBase = (type: string) => {
    switch(type) {
        case 'boolean':
            return `Joi.boolean()`
        case 'character':
        case 'character varying':
        case 'text':
        case 'timestamp without time zone':
            return `Joi.string()`
        case 'integer':
            return `Joi.number().integer()`
        case 'double precision':
        case 'numeric':
            return `Joi.number()`
        case 'uuid':
            return `Joi.string().guid()`
        default:
            const match = type.match(REGEX_CHAR);
            if (match) {
                return `Joi.string().length(${match.groups.len})`;
            }

            return `unknown type`;
    }
}

export const isTrueValue = val => val === 't';



export const getDatabaseResources = async ({db}: ts.IDatabaseBootstrap) => {

    const query = getDatabaseResourcesRaw({db});

    const {rows: records} = await db.raw(query)

    console.log('**********');
    console.log('oooo.records----');
    console.log(records);
    console.log('**********');

    // return records;
    
    return records.reduce((catalog, {
        num,
        table_name,
        column_name,
        attnum,
        notnull,
        type,
        primarykey,
        uniquekey,
        foreignkey,
        foreignkey_fieldnum,
        foreignkey_connnum,
    }) => {
        if (!catalog[table_name]) catalog[table_name] = {};
        catalog[table_name][column_name] = `${joiBase(type)}${joiKeyComponent(isTrueValue(primarykey))}${joiRequired(notnull)}`;
        return catalog;
    }, {});

    // can set other flags based on options arg

    // alpha: Joi.string().invalid(engine.SYMBOL_UNIQUE_KEY_COMPONENT),
    // bravo: Joi.string().invalid(engine.SYMBOL_CREATE_REQUIRED),
    // charlie: Joi.number().invalid(engine.SYMBOL_UPDATE_DISABLED),
    // delta: Joi.number().invalid(engine.SYMBOL_CREATE_DISABLED),
    // echo: Joi.boolean(),
    // foxtrot: Joi.number(),
    // golf: Joi.string(),
    // hotel: Joi.string().invalid(engine.SYMBOL_UNIQUE_KEY_COMPONENT),
    // mike: Joi.number().invalid(...engine.SYMBOLS_GEO_POINT),
    // november: Joi.number().invalid(...engine.SYMBOLS_GEO_POLYGON),
    // oscar: Joi.number().invalid(...engine.SYMBOLS_GEO_POINT),
    // papa: Joi.number().invalid(...engine.SYMBOLS_GEO_POLYGON),
    // zulu: Joi.boolean().invalid(engine.SYMBOL_SOFT_DELETE),


}
