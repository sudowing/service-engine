import { Context } from "koa";
import * as Router from "koa-router";
import * as ts from './interfaces';
import {generateOperations, nameRestEndpointGetRecords, uniqueKeyComponents, validatorInspector} from './utils'

const zzzzz = (qqq, opts?: ts.IParamsControllerSpecs) =>
    async (ctx: Context) => {
        const payload = ctx.method === "GET" ? ctx.request.query : ctx.request.body;

        // get context

        // if (count) ctx.response.set(cnst.X_REQUEST_COUNT, count.toString());
        // if (sql) ctx.response.set(cnst.X_REQUEST_SQL, sql);

        // ctx.response.status = status;
        // ctx.response.body = body;


    }

export const generateServiceRouter = ({db, st, resources}: ts.IServiceConfig) =>
    Object.entries(resources).reduce(
        (router: Router, [resource, validator]) => {
            const {
                resourceEndpoint,
                uniqueEndpoint,
            } = nameRestEndpointGetRecords(resource);

            const { create, read, update, del } = generateOperations({
                db, st, validator, resource,
            });


            router.post(resourceEndpoint, zzzzz(create));

            router.get(resourceEndpoint, zzzzz(read));
            router.put(resourceEndpoint, zzzzz(update));
            router.del(resourceEndpoint, zzzzz(del));

            // if unique make record endpoint
            if (uniqueKeyComponents(validatorInspector(validator)).length) {
                router.get(uniqueEndpoint, zzzzz(read, {unique: true }));
                router.put(uniqueEndpoint, zzzzz(update, {unique: true}));
                router.del(uniqueEndpoint, zzzzz(del, {unique: true}));
            }

            return router;
        },new Router()
    );