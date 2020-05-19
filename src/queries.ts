import * as Joi from "@hapi/joi";

import * as ts from "./interfaces";
import { SYMBOL_UNIQUE_KEY_COMPONENT } from "./const";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  let sql = "unknown db";

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

const REGEX_CHAR = /character\((?<len>\d)\)/;

export const joiBase = (type: string) => {
  switch (type) {
    case "boolean":
      return Joi.boolean();
    case "character":
    case "character varying":
    case "text":
    case "name":
    case "smallint[]":
    case "timestamp without time zone":
      return Joi.string();
    case "integer":
    case "smallint":
      return Joi.number().integer();
    case "double precision":
    case "numeric":
      return Joi.number();
    case "uuid":
      return Joi.string().guid();
    default:
      const match = type.match(REGEX_CHAR);
      if (match) {
        return Joi.string().length(Number(match.groups.len));
      }

      throw new Error(`unknown type ${type}`);
  }
};

export const genDatabaseResourceValidators = async ({
  db,
}: ts.IDatabaseBootstrap) => {
  const { rows: records } = await db.raw(getDatabaseResources({ db }));

  const resources = records.reduce(
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

  const dbResources = records.reduce((collection, record) => {
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
