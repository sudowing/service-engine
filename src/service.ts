import * as Joi from "@hapi/joi";
import * as statusCodes from "http-status-codes";
import * as jwt from "jsonwebtoken";

import * as cnst from "./const";
import * as ts from "./interfaces";

import {
    addOptionsToQueries,
    findGeoFields,
    mysqlPermissionMapper,
    permissionMapper,
    postgresPermissionMapper,
    whitelistedDirections,
    wkbToGeoJson
} from "./utils";
import {
    validateAttributesWhereGeoInFilters,
    validateSubmittedAgainstWhitelist
} from "./validation";

const database = {
    CREATE: "c",
    READ: "r",
    UPDATE: "u",
    DELETE: "d"
};

export const Service = class implements ts.IService {
    public db: ts.IDatabase;
    public logger: any;
    public config: ts.IServiceConfig;
    public acl: null | ts.IAccessControlList;
    public jwtConfig: ts.IJsonWebTokenConfig;
    public enforceAuth: boolean;

    constructor(options: ts.IQueryConfig) {
        const {
            coreDatabase,
            logger,
            config,
            jwtConfig,
            enforceAuth
        } = options;
        this.db = coreDatabase;
        this.logger = logger;
        this.config = config;
        this.acl = null;
        this.jwtConfig = jwtConfig;
        this.enforceAuth = enforceAuth || false;
    }

    public jwtCheck({
        requestId,
        authHeader
    }: ts.IJsonWebTokenCheckPayload): ts.IServiceResponse {
        const authPrefix = cnst.BEARER_HEADER;
        let status = statusCodes.UNAUTHORIZED;
        let body = {
            name: cnst.BEARER_AUTH_FAILURE,
            message: cnst.MISSING_BEARER_AUTH_HEADER
        };

        if (authHeader.startsWith(authPrefix)) {
            const token = authHeader.replace(authPrefix, cnst.BLANK_STRING);
            try {
                const decoded = jwt.verify(token, this.jwtConfig.secret);
                status = statusCodes.OK;
                body = decoded;
            } catch (err) {
                status = statusCodes.UNAUTHORIZED;
                body = {
                    name: err.name,
                    message: err.message
                };
            }
        }
        const response = { status, body };

        if (response.status !== statusCodes.OK) {
            this.logger.error(
                {
                    requestId,
                    ...response.body
                },
                cnst.BEARER_AUTH_FAILURE
            );
        }

        return response;
    }

    public aclCheck({
        requestor,
        table,
        action,
        requestId
    }: ts.IAccessControlListSpecs): ts.IServiceResponse {
        const acl = this.acl;
        const allowedUser = acl && acl[requestor] ? acl[requestor] : null;
        const permit =
            acl &&
            allowedUser &&
            allowedUser[table] &&
            allowedUser[table][action];
        let result: ts.IServiceResponse = {
            status: statusCodes.OK,
            body: { message: cnst.ACL_ACCESS_GRANTED }
        };
        if (!permit && false) {
            result = {
                status: 403,
                body: {
                    message: cnst.ACL_ACCESS_DENIED_MESSAGE,
                    threat: cnst.ACL_ACCESS_DENIED_THREAT,
                    requestId
                }
            };
            this.logger.error(
                { requestor, table, action, requestId },
                cnst.ACL_ACCESS_DENIED
            );
        }
        return result;
    }

    public async queryTableRecords({
        query,
        validator,
        options,
        requestId,
        requestor,
        resourceMiddleware,
        subQuery
    }: ts.IServiceQueryTableRecords): Promise<ts.IServiceResponse> {
        if (this.enforceAuth) {
            const permit = this.aclCheck({
                requestor,
                table: subQuery ? subQuery.query.table : query.table,
                requestId,
                action: database.READ
            });

            if (permit.status !== statusCodes.OK) return permit;
        }

        const callSpecs = { logger: this.logger, requestId, options };

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
                    { ...test, orderBy, requestId },
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
                    { ...test, orderBy, requestId },
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

            const dbQuery = this.db.queryTableRecords({
                userQuery,
                tableOptions: options,
                requestId
            });

            if (query.options.count || query.options.countOnly) {
                const countResponse = await this.db.countTableRecords({
                    userQuery,
                    tableOptions: options,
                    requestId
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
                    requestId,
                    requestor
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

    public async queryTableRecord({
        query,
        validator,
        options,
        requestId,
        requestor,
        resourceMiddleware
    }: ts.IServiceQueryTableRecords): Promise<ts.IServiceResponse> {
        const { table } = query;

        if (this.enforceAuth) {
            const permit = this.aclCheck({
                requestor,
                table,
                requestId,
                action: database.READ
            });

            if (permit.status !== statusCodes.OK) {
                return permit;
            }
        }

        const serviceResponse: ts.IServiceResponse = {
            ...cnst.DEFAULT_SERVICE_RESPONSE
        };

        // validation WHERE
        const validation = Joi.validate(query.where, validator);

        if (validation.error) {
            this.logger.error(
                {
                    detail: validation.error,
                    requestId
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
                    { ...test, attrs, requestId },
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
            const dbQuery: object = this.db.queryTableRecord({
                userQuery: resourceMiddleware
                    ? await resourceMiddleware({ query })
                    : query,
                requestId
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
                    requestId,
                    requestor
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

    public async countTableRecords({
        query,
        validator,
        options,
        requestId,
        requestor,
        resourceMiddleware,
        subQuery
    }: ts.IServiceQueryTableRecords): Promise<ts.IServiceResponse> {
        if (this.enforceAuth) {
            const permit = this.aclCheck({
                requestor,
                table: subQuery ? subQuery.query.table : query.table,
                requestId,
                action: database.READ
            });

            if (permit.status !== statusCodes.OK) return permit;
        }

        const callSpecs = { logger: this.logger, requestId, options };

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
            const [{ count }] = await this.db.countTableRecords({
                userQuery: resourceMiddleware
                    ? await resourceMiddleware({ query, tableOptions: options })
                    : query,
                tableOptions: options,
                requestId
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
                    requestId,
                    requestor
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

    public async createTableRecords({
        query,
        validator,
        requestId,
        requestor,
        resourceMiddleware
    }: ts.IServiceCreateTableRecords): Promise<ts.IServiceResponse> {
        const { table, records } = query;

        if (this.enforceAuth) {
            const permit = this.aclCheck({
                requestor,
                table,
                requestId,
                action: database.READ
            });

            if (permit.status !== statusCodes.OK) {
                return permit;
            }
        }

        const serviceResponse: ts.IServiceResponse = {
            ...cnst.DEFAULT_SERVICE_RESPONSE
        };

        const multiValidator = Joi.object().keys({
            records: Joi.array().items(validator)
        });

        // validation WHERE
        const validation = Joi.validate({ records }, multiValidator);

        if (validation.error) {
            this.logger.error(
                {
                    detail: validation.error,
                    requestId
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
                    { ...test, attrs, requestId },
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
            const dbQuery: object = this.db.createTableRecords({
                userQuery: resourceMiddleware
                    ? ((await resourceMiddleware({ query })) as ts.ITableCreate)
                    : query,
                requestId
            });

            if (query.options.sql) {
                serviceResponse.sql = dbQuery.toString();
            }

            const results: object = await dbQuery;

            serviceResponse.status = statusCodes.CREATED;
            serviceResponse.body = results;

            return serviceResponse;
        } catch (err) {
            // log error here....
            this.logger.error(
                {
                    err,
                    query,
                    requestId,
                    requestor
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

    public async queryUserPermissions(): Promise<ts.IServiceResponse> {
        const serviceResponse: ts.IServiceResponse = {
            ...cnst.DEFAULT_SERVICE_RESPONSE
        };

        const resources = Object.keys(this.config.resources);

        try {
            serviceResponse.status = statusCodes.OK;
            const permissionResponse = await this.db.queryUserPermissions({
                resources
            });

            const permissions =
                this.db.db.client.config.client === cnst.MYSQL
                    ? mysqlPermissionMapper(permissionResponse)
                    : postgresPermissionMapper(permissionResponse);

            serviceResponse.body = permissionMapper(permissions);

            return serviceResponse;
        } catch (err) {
            // log error here....
            this.logger.error(
                {
                    err
                },
                cnst.SERVICE_ERROR_QUERY_USER_PERMISSIONS
            );

            serviceResponse.status = statusCodes.INTERNAL_SERVER_ERROR;
            serviceResponse.body = {
                message: cnst.INTERNAL_ERROR_MESSAGE,
                timestamp: Date.now()
            };
            return serviceResponse;
        }
    }

    public async setServiceAccessControlList() {
        const { status, body } = await this.queryUserPermissions();
        const acl =
            status === statusCodes.OK ? (body as ts.IAccessControlList) : null;
        this.acl = acl;
    }
};

const aclRefresh = async (service: ts.IService) => {
    const { status, body } = await service.queryUserPermissions();
    const acl =
        status === statusCodes.OK ? (body as ts.IAccessControlList) : null;
    service.acl = acl;
};

export const aclInit = async (
    payload: ts.IInitAccessControlList
): Promise<any> => {
    const { service, aclTerm } = payload;
    try {
        await aclRefresh(service);
        setInterval(async () => {
            await aclRefresh(service);
        }, aclTerm);
    } catch (err) {
        service.logger.error(err, cnst.ACL_REFRESH_ERROR);
    }
};
