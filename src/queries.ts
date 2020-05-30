import * as Joi from "@hapi/joi";

import * as ts from "./interfaces";
import { SYMBOL_UNIQUE_KEY_COMPONENT, REGEX_CHAR } from "./const";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  let sql = "unknown db";
  const migrationTable = db.client.config.migrations.tableName || "";

  if (db.client.config.client === "pg") {
    sql = `
      select
      s.nspname resource_schema,
      case
        when c.relkind = 'r' then 'table'
        when c.relkind = 'v' then 'view'
        when c.relkind = 'm' then 'materialized view'
        else 'unknown'
      end as resource_type,
      c.relname as resource_name,
      a.attnum as resource_column_id,
      a.attname as resource_column_name,
      a.attnotnull as notnull,
      pg_catalog.format_type(a.atttypid,
      a.atttypmod) as type,
      case
        when p.contype = 'p' then true
        else false
      end as primarykey,
      case
        when p.contype = 'u' then true
        else false
      end as uniquekey,
      case
        when p.contype = 'f' then p.confkey
      end as foreignkey_fieldnum,
      case
        when p.contype = 'f' then c.relname
      end as foreignkey,
      case
        when p.contype = 'f' then p.conkey
      end as foreignkey_connnum
    from
      pg_attribute a
    join pg_class c on
      c.oid = a.attrelid
    join pg_namespace s on
      c.relnamespace = s.oid
    left join pg_attrdef d on
      d.adrelid = c.oid
      and d.adnum = a.attnum
    left join pg_namespace n on
      n.oid = c.relnamespace
    left join pg_constraint p on
      p.conrelid = c.oid
      and a.attnum = any (p.conkey)
    where
      c.relkind in ('r','v','m') -- tables, views, materialized views
      and a.attnum > 0
      and not a.attisdropped
      and s.nspname = 'public'
      and c.relname not in ('${migrationTable}', '${migrationTable}_lock')
    order by
      s.nspname,
      c.relname,
      a.attnum,
      a.attname;
    `;
  }

  return sql;
};

export const joiKeyComponentText = (keyComponent: boolean) =>
  keyComponent ? `.invalid(engine.SYMBOL_UNIQUE_KEY_COMPONENT)` : ``;

export const joiRequiredText = (required: boolean) =>
  required ? `.required()` : ``;

export const joiKeyComponent = (joi: Joi.Schema, keyComponent: boolean) =>
  keyComponent ? joi.invalid(SYMBOL_UNIQUE_KEY_COMPONENT) : joi;

export const joiRequired = (joi: Joi.Schema, required: boolean) =>
  required ? joi : joi; // need to eval .required() here... think it's breaking the framework

  // this is for postgres. Need one for each engine || each engine version
export const joiBase = (type: string) => {
  switch (type) {
    // 8.1. Numeric Types":
    case "smallint":
    case "integer":
    case "bigint":
        return Joi.number().integer();
    case "decimal":
    case "numeric":
    case "real":
    case "double precision":
        return Joi.number(); // have special values (Infinity, -Infinity, NaN)
    case "smallserial":
    case "serial":
    case "bigserial":
        return Joi.number().integer();
    case "int2":
    case "int4":
    case "int8":
        return Joi.number().integer();
    // 8.2. Monetary Types":
    case "money || bigint in js":
        return Joi.string(); // string as it is arbitrary length
    // 8.3. Character Types":
    // case "character varying(n)": // ignore. default will be string
    // case "varchar(n)": // ignore. default will be string
    // case "character(n)": // ignore. default will be string
    // case "char(n)": // ignore. default will be string
    case "character varying":
    case "text":
    case '"char"':
    case "name":
        return Joi.string();
    // 8.4. Binary Data Types":
    case "bytea":
        return Joi.string();
    // 8.5. Date/Time Types":
    // case "timestamp": tz optional // ignore. default will be string
    // case "timestamp": wtz // ignore. default will be string
    case "timestamp without time zone":
    case "date":
    // case "time": tz optional // ignore. default will be string
    // case "time": wtz // ignore. default will be string
    case "interval":
        return Joi.string();
    // 8.6. Boolean Type":
    case "boolean":
        return Joi.boolean();
    // 8.7. Enumerated Types":
      // ignore. default will be string
    // 8.8. Geometric Types":
    case "point":
    case "line":
    case "lseg":
    case "box":
    case "path":
    case "path":
    case "polygon":
    case "circle":
        return Joi.string(); // will want geoJson on output
    // 8.9. Network Address Types":
    case "cidr":
    case "inet":
    case "macaddr":
        return Joi.string();
    // 8.10. Bit String Types":
    // case "bit(n)": // ignore. default will be string
    // case "bit varying(n)": // ignore. default will be string
        return Joi.string();

    // 8.11. Text Search Types":
    // 8.11.1. tsvector":
    // 8.11.2. tsquery":

    // 8.12. UUID Type":
    case "uuid":
    case "string":
        return Joi.string();
    // 8.13. XML Type":
    case "xml":
        return Joi.string();
    // 8.14. JSON Types":
    case "json":
    case "jsonb":
    case "jsonpath":
        return Joi.string(); // will want to use JSONB on output

    // 8.15. Arrays":
      // ignore. default will be string
      // in the future -- breaking change will type

    // 8.16. Composite Types":
      // ignore. default will be string

    // 8.17. Range Types":
    case "int4range":
    case "int8range":
        return Joi.number().integer();
    case "numrange":
    case "* float":
        return Joi.number();
    case "tsrange":
    case "tstzrange":
    case "daterange":
        return Joi.string();
    // 8.18. Domain Types": // ignore. let default catch it
    // 8.19. Object Identifier Types":
    case "oid":
        return Joi.number().integer();
    case "regproc":
    case "regprocedure":
    case "regoper":
    case "regoperator":
    case "regclass":
    case "regtype":
    case "regrole":
    case "regnamespace":
    case "regconfig":
    case "regdictionary":
        return Joi.string();
    // 8.20. pg_lsn Type":
    case "pg_lsn":
        return Joi.string();
    default:
      const match = type.match(REGEX_CHAR);
      if (match) {
        return Joi.string().length(Number(match.groups.len));
      }
      console.log(`unknown type ${type}`);
      return Joi.string();
  }
};

export const genDatabaseResourceValidators = async ({
  db,
  dbResourceRawRows,
}: ts.IDatabaseBootstrapRaw) => {
  const resources = dbResourceRawRows.reduce(
    (
      catalog,
      {
        resource_schema,
        resource_type,
        resource_name,
        resource_column_id,
        resource_column_name,
        notnull,
        type,
        primarykey,
        uniquekey,
        foreignkey_fieldnum,
        foreignkey,
        foreignkey_connnum,
      }
    ) => {
      if (!catalog[resource_name]) catalog[resource_name] = {};
      catalog[resource_name][resource_column_name] = joiKeyComponent(
        joiBase(type),
        primarykey
      );
      return catalog;
    },
    {}
  );

  const dbResources = dbResourceRawRows.reduce((collection, record) => {
    if (!collection[record.resource_name])
      collection[record.resource_name] = {};
    collection[record.resource_name][record.resource_column_name] = record;
    return collection;
  }, {});

  const validators = Object.entries(resources).reduce(
    (jois, [key, value]: [string, object]) => ({
      ...jois,
      [key]: Joi.object(value),
    }),
    {}
  );

  return { validators, dbResources };

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
};
