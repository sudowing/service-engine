import * as Joi from "@hapi/joi";

import * as ts from "./interfaces";
import { SYMBOL_UNIQUE_KEY_COMPONENT } from "./const";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  let sql = "unknown db";

  if (db.client.config.client === "pg") {
    sql = `
        select
            f.attnum AS num,
            c.relname as table_name,
            f.attname AS column_name,
            f.attnum,
            f.attnotnull AS notnull,
            pg_catalog.format_type(f.atttypid,f.atttypmod) AS type,
            CASE
                WHEN p.contype = 'p' THEN true
                ELSE false
            END AS primarykey,
            CASE
                WHEN p.contype = 'u' THEN true
                ELSE false
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

export const joiBaseText = (type: string) => {
  switch (type) {
    case "boolean":
      return `Joi.boolean()`;
    case "character":
    case "character varying":
    case "text":
    case "timestamp without time zone":
      return `Joi.string()`;
    case "integer":
      return `Joi.number().integer()`;
    case "double precision":
    case "numeric":
      return `Joi.number()`;
    case "uuid":
      return `Joi.string().guid()`;
    default:
      const match = type.match(REGEX_CHAR);
      if (match) {
        return `Joi.string().length(${match.groups.len})`;
      }

      throw new Error(`unknown type ${type}`);
  }
};

export const joiBase = (type: string) => {
  switch (type) {
    case "boolean":
      return Joi.boolean();
    case "character":
    case "character varying":
    case "text":
    case "timestamp without time zone":
      return Joi.string();
    case "integer":
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
        num,
        table_name,
        column_name,
        notnull,
        type,
        primarykey,
        uniquekey,
        foreignkey,
        foreignkey_fieldnum,
        foreignkey_connnum,
      }
    ) => {
      if (!catalog[table_name]) catalog[table_name] = {};
      catalog[table_name][column_name] = joiKeyComponent(
        joiBase(type),
        primarykey
      );
      return catalog;
    },
    {}
  );

  const dbResources = records.reduce((collection, record) => {
    if (!collection[record.table_name]) collection[record.table_name] = {};
    collection[record.table_name][record.column_name] = record;
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
