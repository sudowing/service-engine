import * as Knex from "knex";

import * as cnst from "./const";
import * as ts from "./interfaces";
import { convertMetersToDecimalDegrees } from "./utils";

/* tslint:disable */

// sqlite doesnt have schemas and as such this will break the knex querybuilder
export const sqlSchemaResource = ({ resource_schema, resource_name }): string =>
  resource_schema === ""
    ? resource_name
    : `${resource_schema}.${resource_name}`;

export const toSearchQuery = ({
  db,
  st,
  resource,
  components,
  context,
  schemaResource,
  subqueryOptions: { subquery, aggregationFn },
}: ts.IParamsToSearchQuery) => {

  const prefix = subquery ? 'top_' : '';


  const main: any = !!subquery
    ? db.raw(`(${subquery.toString()}) as ${prefix}main`)
    : sqlSchemaResource(schemaResource);

  const base = db.select(context.fields).from(main);
  const query = !aggregationFn ? base :
    db.select().from(db.raw(`(${aggregationFn(base).toString()}) as ${prefix}complex`));
  return (
    query
      // notWhere where/notWhere
      // statementContext and/or
      .where((sql) => {
        for (const { field, operation, value } of components) {
          if (cnst.BASIC_QUERY_OPERATIONS.get(operation)) {
            sql.andWhere(
              field,
              cnst.BASIC_QUERY_OPERATIONS.get(operation),
              value
            );
          } else if (operation === cnst.RANGE) {
            sql.whereBetween(field, [value[0], value[1]]);
          } else if (operation === cnst.NOT_RANGE) {
            sql.whereNotBetween(field, [value[0], value[1]]);
          } else if (operation === cnst.IN) {
            sql.whereIn([field], value as any[]);
          } else if (operation === cnst.NOT_IN) {
            sql.whereNotIn([field], value as any[]);
          } else if (operation === cnst.NULL) {
            sql.whereNull(field);
          } else if (operation === cnst.NOT_NULL) {
            sql.whereNotNull(field);
          } else if (operation === cnst.GEO_BBOX) {
            sql.andWhere(
              st.intersects(
                field,
                st.makeEnvelope(
                  value[0],
                  value[1],
                  value[2],
                  value[3],
                  cnst.SRID
                )
              )
            );
          } else if (operation === cnst.GEO_RADIUS) {
            const [lat, long, meters] = value as number[];
            const coords = st.setSRID(st.makePoint(long, lat), cnst.SRID);
            sql.andWhere(
              st.dwithin(field, coords, convertMetersToDecimalDegrees(meters))
            );
          } else if (operation === cnst.GEO_POLYGON) {
            sql.andWhere(
              st.intersects(field, st.geomFromText(value as string, cnst.SRID))
            );
          }
        }

        return sql;
      })
      .orderBy(context.orderBy || [])
      .limit(context.limit)
      .offset(((context.page || 1) - 1) * (context.limit || 100))
  );
};

export const toCreateQuery = ({
  db,
  st,
  resource,
  query,
  context,
  schemaResource,
}: ts.IParamsToQueryBase) =>
  db.insert(query, context.fields).into(sqlSchemaResource(schemaResource)); // fields exists. was set in generic

export const toReadQuery = ({
  db,
  st,
  resource,
  query,
  context,
  schemaResource,
}: ts.IParamsToQueryBase) =>
  db
    .from(sqlSchemaResource(schemaResource))
    .select(context.fields)
    .where(query); // fields exists. was set in generic

export const toUpdateQuery = (keys: string[]) => ({
  db,
  st,
  resource,
  query,
  context,
  searchQuery,
  schemaResource,
}: ts.IParamsToQueryWithSearch) => {
  const { pk, values } = Object.entries(query).reduce(
    (bundle, [key, value]) => {
      const data = keys.includes(key) ? bundle.pk : bundle.values;
      data[key] = value;
      return bundle;
    },
    { pk: {}, values: {} }
  );

  return db(sqlSchemaResource(schemaResource))
    .where(pk) // pull only keys from query || ensure it's being done upstream
    .update(values, context.fields); // remove keys & cannot update fields from query && fields exists. was set in generic
};

export const toDeleteQuery = (keys: string[]) => ({
  db,
  st,
  resource,
  query,
  searchQuery,
  hardDelete,
  schemaResource,
}: ts.IParamsToDeleteQueryWithSearch) => {
  const { pk }: any = Object.entries(query).reduce(
    (bundle, [key, value]) => {
      const data = keys.includes(key) ? bundle.pk : bundle.values;
      data[key] = value;
      return bundle;
    },
    { pk: {}, values: {} }
  );

  if (hardDelete) {
    return db(sqlSchemaResource(schemaResource)).where(pk).delete();
  }

  // if soft delete [this will need to support custom `active` columns as dbs likely have these flags with different names]
  pk.active = true;

  const sqlcount = db(sqlSchemaResource(schemaResource)).count().where(pk);
  const sqlUpdate = db(sqlSchemaResource(schemaResource))
    .where(pk)
    .update({ active: false });

  const softDelete = new Promise(async (resolve, reject) => {
    try {
      const [{ count }]: any = await sqlcount;

      const n = Number(count);

      if (n !== 0) {
        // no need to do the delete if no matching records exist. Call it a day
        await sqlUpdate;
      }

      resolve(n);
    } catch (err) {
      reject(err);
    }
  });
  softDelete.toString = () => sqlUpdate.toString();
  return softDelete;
};




export const aggregationFnBuilder = (db: Knex) => (
  calculated_fields: any,
  group_by?: string[]
) => (knex_query: Knex.QueryBuilder): Knex.QueryBuilder => {
  const defineCalculatedFields = (arr: string[]): (string | Knex.Raw)[] =>
    arr.map((item) =>
      calculated_fields[item]
        ? db.raw(`${calculated_fields[item]} as ${item}`)
        : item
    );

  // @ts-ignore // replace field name with calculation def before executing
  knex_query._statements = knex_query._statements.map(
    ({ grouping, value }) => ({
      grouping,
      value: grouping !== "columns" ? value : defineCalculatedFields(value),
    })
  );
  return group_by ? knex_query.groupBy(group_by) : knex_query;
};










export const genCountQuery = (
  db,
  knex_query: Knex.QueryBuilder
): Knex.QueryBuilder => {
  // explictely remove sql limit
  // https://github.com/knex/knex/blob/e37aeaa31c8ef9c1b07d2e4d3ec6607e557d800d/lib/query/compiler.js#L522
  // https://github.com/knex/knex/blob/master/lib/query/builder.js#L872
  // @ts-ignore -- accessing private property
  knex_query._single.limit = undefined;

  const count_query = db.from(db.raw(`(${knex_query.toString()}) as count_query`));
  // this is needed to make the db result mysql/postgres agnostic
  return count_query.count("* as count");
};
