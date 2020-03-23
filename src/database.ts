import * as cnst from "./const";
import * as ts from "./interfaces";
import { mysqlPrivilegeQuery, postgresPrivilegeQuery } from "./queries.utils";
import { convertOperation, handleSpecialValues } from "./utils";

// 'bounding_box',
// 'distance',
// 'polygon',
export const SRID = 4326;

export const convertMetersToDecimalDegrees = (payload: { meters: string }) => {
    const { meters } = payload;

    // :TODO more accurate here
    // http://www.movable-type.co.uk/scripts/latlong.html

    return parseFloat(meters) / 1113200;
};

export const Database = class implements ts.IDatabase {
    db: any;
    logger: any;
    st: any;
    knexConfig: ts.IKnexConfig;

    constructor(options: ts.IDatabaseConfig) {
        const { knexConfig, logger, db, st } = options;
        this.knexConfig = knexConfig;
        this.logger = logger;
        this.db = db;
        this.st = st;
    }

    genCoreTableQuery({
        userQuery: {
            table,
            where,
            filters,
            ranges,
            geoFilters,
            subquery
        },
        tableOptions
    }: ts.IDatabaseQueryTableRecordsCore) {
        const query = this.db.from(this.db.raw(table));

        if (tableOptions && tableOptions.timeout) query.timeout(tableOptions);

        if (subquery && Object.keys(subquery)) {
            for (const field of Object.keys(subquery)) {
                const items = [...subquery[field]];
                if (items.length) {
                    const difference = new Set(
                        [...items].filter(x => !cnst.SPECIAL_KEYS.has(x))
                    );
                    if (difference.size) query.whereIn(field, [...difference]);

                    const intersection = new Set(
                        [...items].filter(x => cnst.SPECIAL_KEYS.has(x))
                    );
                    if (intersection.size) {
                        for (const special of [...intersection]) {
                            query.andWhere(field, handleSpecialValues(special));
                        }
                    }
                }
            }
        }

        if (where) {
            const _where = Object.entries(where).reduce(
                (accum, [key, value]) => ({
                    ...accum,
                    [key]: handleSpecialValues(value)
                }),
                {}
            );

            query.andWhere(_where);
        }

        if (filters) {
            for (const { operation, field, value } of filters) {
                // Explicitly don't use SPECIAL_VALUES since only NULL has this approach
                if (typeof value === "string" && value === "_NULL") {
                    if (operation === cnst.OP_EQ_STRING) query.whereNull(field);
                    else if (operation === cnst.OP_NE_STRING)
                        query.whereNotNull(field);
                    else
                        throw new Error(
                            `Unsupported operation ${operation} for value _NULL`
                        );
                } else {
                    query.andWhere(field, convertOperation(operation), value);
                }
            }
        }

        // if (ranges) {
        //     for (const { key, values } of ranges) {
        //         query.andWhere(function() {
        //             for (const value of values) {

        //                 if (value === null) this.orWhereNull(key);
        //                 else if (value[0] === "")
        //                     this.orWhere(key, "<=", value[1]);
        //                 else if (value[1] === "")
        //                     this.orWhere(key, ">=", value[0]);
        //                 else {
        //                     this.orWhere(function() {
        //                         this.andWhere(key, ">=", value[0]);
        //                         this.andWhere(key, "<=", value[1]);
        //                     });
        //                 }
        //             }
        //         });
        //     }
        // }

        if (geoFilters && tableOptions && tableOptions.geoquery) {
            for (const filter of geoFilters) {
                query.andWhere(this.generateGeoQuery(filter));
            }
        }

        return query;
    }

    queryTableRecords({
        userQuery,
        tableOptions,
        reqId
    }: ts.IDatabaseQueryTableRecords) {
        const { options } = userQuery;
        const { attributes, pagination, sqlOnly } = options;
        const { orderBy, limit, offset } = pagination
            ? pagination
            : ({} as any);

        let query = this.genCoreTableQuery({ userQuery, tableOptions });

        // userQuery.extra is a fn that appends to the knex object
        // it's added by the middleware
        if (userQuery.extra)
            query = this.db.from(
                this.db.raw(
                    `(${userQuery
                        .extra({ query, db: this })
                        .toString()}) as tbl`
                )
            );

        const fields = attributes ? attributes : [];
        query.select(fields);

        if (orderBy) query.orderBy(orderBy);
        if (limit) query.limit(limit);
        if (offset) query.offset(offset);

        this.logger.debug(
            {
                userQuery,
                sql: query.toString(),
                reqId
            },
            cnst.LOG_MSG_EXEC_SQL
        );

        return query;
    }

    countTableRecords({
        userQuery,
        tableOptions,
        reqId
    }: ts.IDatabaseQueryTableRecords) {
        let query = this.genCoreTableQuery({ userQuery, tableOptions });
        const { options } = userQuery;
        const { countOnly, countOnlyLimit } = options;

        // userQuery.extra is a fn that appends to the knex object
        // it's added by the middleware
        if (userQuery.extra)
            query = this.db.from(
                this.db.raw(
                    `(${userQuery
                        .extra({ query, db: this })
                        .toString()}) as tbl`
                )
            );

        if (countOnly && countOnlyLimit) {
            query.limit(countOnlyLimit);
            query = this.db.from(
                this.db.raw(`(${query.toString()}) as limited`)
            );
        }

        // this is needed to make the db result mysql/postgres agnostic
        query.count(cnst.SQL_STAR_AS_COUNT);
        this.logger.debug(
            {
                userQuery,
                sql: query.toString(),
                reqId
            },
            cnst.LOG_MSG_EXEC_SQL
        );

        return query;
    }

    queryTableRecord(payload: ts.IDatabaseQueryTableRecords) {
        const { userQuery, reqId } = payload;

        const { table, where, options, in: subquery } = userQuery;
        const { attributes } = options;

        const fields = attributes ? attributes : [];

        const query = this.db
            .select(fields)
            .from(this.db.raw(table))
            .where(where)
            .first();

        // potential to be added via middleware || think partition keys
        if (subquery && Object.keys(subquery)) {
            for (const field of Object.keys(subquery)) {
                const items = [...subquery[field]];
                if (items.length) {
                    query.whereIn(field, items);
                }
            }
        }

        this.logger.debug(
            {
                userQuery,
                sql: query.toString(),
                reqId
            },
            cnst.LOG_MSG_EXEC_SQL
        );

        return query;
    }

    generateGeoQuery({ operation, field, value }: ts.IQueryFilter) {
        switch (operation) {
            case cnst.GEO_OP_BOUNDING_BOX:
                const [minLong, minLat, maxLong, maxLat] = value;
                return this.st.intersects(
                    field,
                    this.st.makeEnvelope(
                        parseFloat(minLat),
                        parseFloat(minLong),
                        parseFloat(maxLat),
                        parseFloat(maxLong),
                        SRID
                    )
                );
            case cnst.GEO_OP_DISTANCE:
                const [lat, long, meters] = value;

                const coords = this.st.setSRID(
                    this.st.makePoint(parseFloat(long), parseFloat(lat)),
                    SRID
                );

                return this.st.dwithin(
                    field,
                    coords,
                    convertMetersToDecimalDegrees({ meters })
                );
            case cnst.GEO_OP_POLYGON: // also supports multipolygons
                const [polygon] = value;

                // polygon passed in url as base64 to avoid comma parsing
                const parsedPolygon = Buffer.from(
                    polygon || cnst.EMPTY_STRING,
                    cnst.BASE_64
                ).toString();

                return this.st.intersects(
                    field,
                    this.st.geomFromText(parsedPolygon, SRID)
                );
            case cnst.GEO_OP_GEOJSON:
                const [geojson] = value;
                // geojson passed in url as base64 to avoid comma parsing
                const parsedGeojson = Buffer.from(
                    geojson || cnst.EMPTY_STRING,
                    cnst.BASE_64
                ).toString();
                const processedGeojson = this.st.setSRID(
                    this.st.geomFromGeoJSON(parsedGeojson),
                    SRID
                );

                return this.st.intersects(field, processedGeojson);

            default:
                return cnst.BLANK_STRING;
        }
    }

    // queryUserPermissions(payload: ts.IQueryUserPermissions) {
    //     const { resources } = payload;
    //     const csvResources = resources
    //         .map(item => `'${item}'`)
    //         .join(cnst.COMMA);

    //     const privilegeQuery =
    //         this.db.client.config.client === cnst.MYSQL
    //             ? mysqlPrivilegeQuery
    //             : postgresPrivilegeQuery;

    //     const query = this.db.raw(privilegeQuery(csvResources));

    //     this.logger.debug(
    //         {
    //             sql: query.toString()
    //         },
    //         cnst.LOG_MSG_EXEC_SQL
    //     );

    //     return query;
    // }

    // createTableRecords({
    //     userQuery: { table, records, options },
    //     reqId
    // }: ts.IDatabaseCreateTableRecords) {
    //     const { attributes } = options;

    //     const fields = attributes ? attributes : [];

    //     const query = this.db
    //         .insert(records)
    //         .into(table)
    //         .returning(fields);

    //     this.logger.debug(
    //         {
    //             sql: query.toString(),
    //             reqId
    //         },
    //         cnst.LOG_MSG_EXEC_SQL
    //     );

    //     return query;
    // }
    
};
