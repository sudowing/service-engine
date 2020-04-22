import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
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
    this.db = db;
    this.st = st;
    this.logger = logger;
    this.name = name;
    this.validator = validator;
    const { schema, report, meta } = util.validationExpander(validator);
    this.schema = schema;
    this.report = report;
    this.meta = meta;

    // this.middleware
    // this.permissions (CRUD, hard/soft delete)
  }

  queryBase() {
    return {
      db: this.db,
      st: this.st,
      resource: this.name,
    };
  }

  // context in by post
  create({ payload, context, requestId }: ts.IParamsProcessBase) {
    const { errors } = this.meta.searchQueryParser(context);
    if (errors) return util.rejectResource("context_errors", errors);

    const { error, value: query } = util.validateOneOrMany(
      this.schema.create,
      payload
    );
    if (error) return util.rejectResource("validation_error", error);

    const sql = util.toCreateQuery({
      ...this.queryBase(),
      query,
      context,
    });
    return util.resolveResource({ sql });
  }

  read({ payload, requestId }: ts.IParamsProcessBase) {
    const { errors, context } = this.meta.searchQueryParser(payload);
    if (errors) return util.rejectResource("context_errors", errors);

    const { error, value: query } = this.schema.read.validate(
      util.removeContextKeys(context, payload)
    );
    if (error) return util.rejectResource("validation_error", error);

    const sql = util.toReadQuery({
      ...this.queryBase(),
      query,
      context,
    });
    return util.resolveResource({ sql });
  }

  // context in by patch
  update({ payload, context, requestId }: ts.IParamsProcessBase) {
    const { errors } = this.meta.searchQueryParser(context);
    if (errors) return util.rejectResource("context_errors", errors);

    // need to remove context keys
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      payload
    );
    if (error) return util.rejectResource("validation_error", error);

    // if (searchQuery) {
    //   const validSearch = this.schema.search.validate(searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toUpdateQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery: undefined,
    });
    return util.resolveResource({ sql });
  }

  // soft delete VS hard delete defined by db query fn
  delete({
    payload,
    context,
    requestId,
    searchQuery,
    hardDelete,
  }: ts.IParamsProcessDelete) {
    const { errors } = this.meta.searchQueryParser(context);
    if (errors) return util.rejectResource("context_errors", errors);

    // need to remove context keys
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      payload
    );
    if (error) return util.rejectResource("validation_error", error);

    // if (searchQuery) {
    //   const validSearch = this.schema.search.validate(searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toDeleteQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery,
      hardDelete,
    });
    return util.resolveResource({ sql });
  }

  search(payload: any) {
    const { errors, components, context } = this.meta.searchQueryParser(
      payload
    );
    if (errors) return util.rejectResource("context_errors", errors);

    const sql = util.toSearchQuery({
      ...this.queryBase(),
      context,
      components,
    });
    return util.resolveResource({ sql });
  }
}
