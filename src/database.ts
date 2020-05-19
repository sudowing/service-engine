import * as cnst from "./const";
import * as ts from "./interfaces";
import { convertMetersToDecimalDegrees } from "./utils";

/* tslint:disable */

export const toSearchQuery = ({
  db,
  st,
  resource,
  components,
  context,
}: ts.IParamsToSearchQuery) =>
  db
    .from(resource)
    .orderBy(context.orderBy || [])
    .limit(context.limit || 100)
    .offset(((context.page || 1) - 1) * (context.limit || 100))
    // notWhere where/notWhere
    // statementContext and/or
    .select(context.fields)
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
              st.makeEnvelope(value[0], value[1], value[2], value[3], cnst.SRID)
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
    });

export const toCreateQuery = ({
  db,
  st,
  resource,
  query,
  context,
}: ts.IParamsToQueryBase) => db.insert(query, context.fields).into(resource); // fields exists. was set in generic

export const toReadQuery = ({
  db,
  st,
  resource,
  query,
  context,
}: ts.IParamsToQueryBase) =>
  db.from(resource).select(context.fields).where(query); // fields exists. was set in generic

export const toUpdateQuery = (keys: string[]) => ({
  db,
  st,
  resource,
  query,
  context,
  searchQuery,
}: ts.IParamsToQueryWithSearch) => {
  const { pk, values } = Object.entries(query).reduce(
    (bundle, [key, value]) => {
      const data = keys.includes(key) ? bundle.pk : bundle.values;
      data[key] = value;
      return bundle;
    },
    { pk: {}, values: {} }
  );

  return db(resource)
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
    // hard delete
    return db(resource).where(pk).delete();
  }

  // if soft delete
  pk.active = true;

  const sqlcount = db(resource).count().where(pk);
  const sqlUpdate = db(resource).where(pk).update({ active: false });

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
