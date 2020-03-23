import * as Joi from "@hapi/joi";
import * as statusCodes from "http-status-codes";

import * as cnst from "./const";
import * as ts from "./interfaces";

import {
    addOptionsToQueries,
    findGeoFields,
    whitelistedDirections,
    wkbToGeoJson
} from "./utils";
import {
    validateAttributesWhereGeoInFilters,
    validateSubmittedAgainstWhitelist
} from "./validation";

export const Service = class implements ts.IService {
    db: ts.IDatabase;
    logger: any;

    constructor(options: ts.IQueryConfig) {
        this.db = options.db;
        this.logger = options.logger;
    }

    async readRecords({
        query,
        validator,
        options,
        reqId,
        resourceMiddleware,
        subQuery
    }: ts.IServiceSelect___TableRecords): Promise<ts.IServiceResponse> {

        const callSpecs = { logger: this.logger, reqId, options };

        const queries = (subQuery
            ? [{ query, validator }, subQuery]
            : [{ query, validator }]
        ).map(item => addOptionsToQueries({ options, ...item }));

        const serviceResponses = queries.map(item =>
            validateAttributesWhereGeoInFilters({ ...item, ...callSpecs })
        );

        for (const srvcResponse of serviceResponses) {
            if (srvcResponse.status !== statusCodes.OK) {
                return srvcResponse;
            }
        }

        const { tableFields, geoFields } = queries[0];
        const [serviceResponse] = serviceResponses;

        // query only
        const { pagination } = query.options;
        // validation ORDER_BY
        if (pagination && pagination.orderBy) {
            const { orderBy } = pagination;

            let errorResponse = {
                message: cnst.VALIDATION_ERROR_MSG_ORDER_BY,
                detail: cnst.VALIDATION_ERROR_MSG_ORDER_BY_DETAIL
            };

            // let submission =
            let test = validateSubmittedAgainstWhitelist({
                submission: orderBy.map((x: ts.IOrderBy) => x.column),
                whitelist: tableFields,
                errorResponse
            });

            if (!test.valid && test.error) {
                this.logger.error(
                    { ...test, orderBy, reqId },
                    cnst.VALIDATION_ERROR_MSG_ORDER_BY_UNSUPPORTED_FIELD
                );

                serviceResponse.status = statusCodes.BAD_REQUEST;
                serviceResponse.body = test.error;
                return serviceResponse;
            }

            errorResponse = {
                message: cnst.VALIDATION_ERROR_MSG_ORDER_BY,
                detail: cnst.VALIDATION_ERROR_MSG_ORDER_BY_UNSUPPORTED_DIRECTION
            };

            test = validateSubmittedAgainstWhitelist({
                submission: orderBy.map((x: ts.IOrderBy) => x.order),
                whitelist: whitelistedDirections,
                errorResponse
            });

            if (!test.valid && test.error) {
                this.logger.error(
                    { ...test, orderBy, reqId },
                    cnst.VALIDATION_ERROR_MSG_ORDER_BY_UNSUPPORTED_FIELD
                );

                serviceResponse.status = statusCodes.BAD_REQUEST;
                serviceResponse.body = test.error;
                return serviceResponse;
            }
        }

        query.options.attributes = query.options.attributes || tableFields;
        if (subQuery) query.subQuery = subQuery.query;

        try {
            const userQuery = resourceMiddleware
                ? await resourceMiddleware({ query, tableOptions: options })
                : query;

            const dbQuery = this.db.readRecords({
                userQuery,
                tableOptions: options,
                reqId
            });

            if (query.options.count || query.options.countOnly) {
                const countResponse = await this.db.countRecords({
                    userQuery,
                    tableOptions: options,
                    reqId
                });
                const count = countResponse[0].count;
                serviceResponse.count = count;

                if (query.options.countOnly) {
                    serviceResponse.status = statusCodes.OK;
                    serviceResponse.body = { count };
                    return serviceResponse;
                }
            }

            const sql = dbQuery.toString();

            if (query.options.sql) {
                serviceResponse.sql = sql;
            }

            if (query.options.sqlOnly) {
                serviceResponse.status = statusCodes.OK;
                serviceResponse.body = { sql };
                return serviceResponse;
            }

            serviceResponse.status = statusCodes.OK;
            serviceResponse.body = await dbQuery;

            const rawResults = await dbQuery;

            const results = geoFields.length
                ? wkbToGeoJson(rawResults, geoFields)
                : rawResults;
            serviceResponse.body = results;

            return serviceResponse;
        } catch (err) {
            this.logger.error(
                {
                    err,
                    query,
                    reqId,
                },
                cnst.SERVICE_ERROR_QUERY_TABLE_RECORDS
            );

            serviceResponse.status = statusCodes.INTERNAL_SERVER_ERROR;
            serviceResponse.body = {
                message: cnst.INTERNAL_ERROR_MESSAGE,
                timestamp: Date.now()
            };
            return serviceResponse;
        }
    }

    async readRecord({
        query,
        validator,
        options,
        reqId,
        resourceMiddleware
    }: ts.IServiceSelect___TableRecords): Promise<ts.IServiceResponse> {
        const { table } = query;

        const serviceResponse: ts.IServiceResponse = {
            ...cnst.DEFAULT_SERVICE_RESPONSE
        };

        // validation WHERE
        const validation = Joi.validate(query.where, validator);

        if (validation.error) {
            this.logger.error(
                {
                    detail: validation.error,
                    reqId
                },
                cnst.VALIDATION_ERROR
            );
            const validationError = {
                message: cnst.VALIDATION_ERROR_MSG_WHERE,
                detail: validation.error
            };

            serviceResponse.status = statusCodes.BAD_REQUEST;
            serviceResponse.body = validationError;
            return serviceResponse;
        }

        // define table column list from JOI schema
        // used in validating ORDER_BY, ATTRIBUTES, FILTERING
        const tableFields = Object.keys(validator.describe().children);

        // validation ATTRIBUTES
        if (query.options.attributes) {
            const attrs = Array.isArray(query.options.attributes)
                ? query.options.attributes
                : [query.options.attributes];

            const errorResponse = {
                message: cnst.VALIDATION_ERROR_MSG_ATTRIBUTES,
                detail: cnst.VALIDATION_ERROR_MSG_ATTRIBUTES_DETAIL
            };
            const submission = attrs.map((x: any) => x);
            const test = validateSubmittedAgainstWhitelist({
                submission,
                whitelist: tableFields,
                errorResponse
            });

            if (!test.valid && test.error) {
                this.logger.error(
                    { ...test, attrs, reqId },
                    cnst.VALIDATION_ERROR_MSG_ATTRIBUTES_UNSUPPORTED_FIELD
                );

                serviceResponse.status = statusCodes.BAD_REQUEST;
                serviceResponse.body = test.error;
                return serviceResponse;
            }
        } else {
            query.options.attributes = tableFields;
        }

        try {
            const dbQuery: object = this.db.readRecord({
                userQuery: resourceMiddleware
                    ? await resourceMiddleware({ query })
                    : query,
                reqId
            });

            if (query.options.sql) {
                serviceResponse.sql = dbQuery.toString();
            }

            const record: object = await dbQuery;

            let geoFields: string[] = [];
            if (options && options.geoquery) {
                geoFields = findGeoFields(validator);
            }

            const result = geoFields.length
                ? wkbToGeoJson([record], geoFields)[0]
                : record;

            serviceResponse.status = statusCodes.OK;
            serviceResponse.body = result;

            return serviceResponse;
        } catch (err) {
            // log error here....
            this.logger.error(
                {
                    err,
                    query,
                    reqId,
                },
                cnst.SERVICE_ERROR_QUERY_TABLE_RECORDS
            );

            serviceResponse.status = statusCodes.INTERNAL_SERVER_ERROR;
            serviceResponse.body = {
                message: cnst.INTERNAL_ERROR_MESSAGE,
                timestamp: Date.now()
            };
            return serviceResponse;
        }
    }

    async countRecords({
        query,
        validator,
        options,
        reqId,
        resourceMiddleware,
        subQuery
    }: ts.IServiceSelect___TableRecords): Promise<ts.IServiceResponse> {

        const callSpecs = { logger: this.logger, reqId, options };

        const queries = (subQuery
            ? [{ query, validator }, subQuery]
            : [{ query, validator }]
        ).map(item => addOptionsToQueries({ options, ...item }));

        const serviceResponses = queries.map(item =>
            validateAttributesWhereGeoInFilters({ ...item, ...callSpecs })
        );

        for (const srvcResponse of serviceResponses) {
            if (srvcResponse.status !== statusCodes.OK) {
                return srvcResponse;
            }
        }

        const [serviceResponse] = serviceResponses;
        if (subQuery) query.subQuery = subQuery.query;

        try {
            const [{ count }] = await this.db.countRecords({
                userQuery: resourceMiddleware
                    ? await resourceMiddleware({ query, tableOptions: options })
                    : query,
                tableOptions: options,
                reqId
            });
            serviceResponse.status = statusCodes.OK;
            serviceResponse.body = { count };
            return serviceResponse;
        } catch (err) {
            // log error here....
            this.logger.error(
                {
                    err,
                    query,
                    reqId,
                },
                cnst.SERVICE_ERROR_QUERY_TABLE_RECORDS
            );

            serviceResponse.status = statusCodes.INTERNAL_SERVER_ERROR;
            serviceResponse.body = {
                message: cnst.INTERNAL_ERROR_MESSAGE,
                timestamp: Date.now()
            };
            return serviceResponse;
        }
    }

};


