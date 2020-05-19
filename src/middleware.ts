import { v4 as uuidv4 } from "uuid";
import {HEADER_REQUEST_ID} from './const'
import * as Joi from "@hapi/joi";

export const prepRequestForService = async (
    ctx: Joi.Context,
    next: () => Promise<{}>
): Promise<void> => {
    // assign request uuid & set in state for logs and response header
    const reqId = uuidv4();
    ctx.response.set(HEADER_REQUEST_ID, reqId);
    ctx.state = { reqId  };
    await next();
}