import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
import * as cnst from "./const";
import * as ts from "./interfaces";
import * as util from "./utils";

export class Resource implements ts.IClassResource {
  public db: knex;
  public st: knexPostgis.KnexPostgis;
  public logger: bunyan;
  public name: string;
  public validator: Joi.Schema;
  public schema: ts.IValidationExpanderSchema;
  public report: ts.IValidationExpanderReport;
  public meta: ts.IValidationExpanderMeta;

  // need to add logger statements throughout
  constructor({
    db,
    st,
    logger,
    name,
    validator,
  }: ts.IClassResourceConstructor) {
    // tslint:disable-next-line: no-console
    console.log("logger", logger);
    this.db = db;
    this.st = st;
    this.logger = logger;
    this.name = name;
    this.validator = validator;
    const { schema, report, meta } = util.validationExpander(validator);
    this.schema = schema;
    this.report = report;
    this.meta = meta;

    // this.middleware || for read && search
    // this.permissions (CRUD, hard/soft delete)
  }

  queryBase() {
    return {
      db: this.db,
      st: this.st,
      resource: this.name,
    };
  }

  contextParser(input: ts.IParamsProcessBase) {
    let context: ts.ISearchQueryContext = cnst.SEARCH_QUERY_CONTEXT;
    let rejection: ts.IRejectResource = {
      errorType: undefined,
      error: undefined,
    };
    if (input.context) {
      const result = util.queryContextParser(this.validator, input.context);
      if (result.errors)
        rejection = util.rejectResource(cnst.CONTEXT_ERRORS, result.errors);
      // returned context is mutated if passed
      context = result.context;
    }
    return {
      ...rejection,
      context,
    };
  }

  // context in by post
  create(input: ts.IParamsProcessBase) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: "create",
      },
      "resource_create"
    );

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: "create",
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    const { error, value: query } = util.validateOneOrMany(
      this.schema.create,
      input.payload
    );
    if (error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.CREATE,
          error,
        },
        cnst.VALIDATION_ERROR
      );

      return util.rejectResource(cnst.VALIDATION_ERROR, error);
    }

    const sql = util.toCreateQuery({
      ...this.queryBase(),
      query,
      context,
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.CREATE,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql });
  }

  read(input: ts.IParamsProcessBase) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: cnst.READ,
      },
      "resource_read"
    );

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.READ,
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    const { error, value: query } = this.schema.read.validate(input.payload);
    if (error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.READ,
          error,
        },
        cnst.VALIDATION_ERROR
      );

      return util.rejectResource(cnst.VALIDATION_ERROR, error);
    }

    const sql = util.toReadQuery({
      ...this.queryBase(),
      query,
      context,
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.READ,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql });
  }

  update(input: ts.IParamsProcessWithSearch) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: cnst.UPDATE,
      },
      "resource_update"
    );

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.UPDATE,
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    // need to remove context keys || dont know if this is true please check (25 April)
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.UPDATE,
          error,
        },
        cnst.VALIDATION_ERROR
      );

      return util.rejectResource(cnst.VALIDATION_ERROR, error);
    }

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toUpdateQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.UPDATE,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql });
  }

  // soft delete VS hard delete defined by db query fn
  delete(input: ts.IParamsProcessDelete) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: cnst.DELETE,
      },
      "resource_delete"
    );

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.DELETE,
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    // need to remove context keys
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.DELETE,
          error,
        },
        cnst.VALIDATION_ERROR
      );

      return util.rejectResource(cnst.VALIDATION_ERROR, error);
    }

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toDeleteQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
      hardDelete: input.hardDelete,
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.DELETE,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql });
  }
  search(input: ts.IParamsProcessBase) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: cnst.SEARCH,
      },
      "resource_search"
    );

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.SEARCH,
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    const { errors, components } = this.meta.searchQueryParser(
      input.payload,
      input.context
    );
    if (errors.length) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.DELETE,
          errors,
        },
        cnst.VALIDATION_ERROR
      );
      return util.rejectResource(cnst.CONTEXT_ERRORS, errors);
    }

    const sql = util.toSearchQuery({
      ...this.queryBase(),
      context,
      components,
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.SEARCH,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql });
  }
}
