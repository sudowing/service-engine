// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as clss from "../class";
import * as database from "../database";
import * as validation from "../validation";

describe("untested modules", () => {
    describe("simply get them represented on the coverage report", () => {
      it("clss", () => {
        expect(typeof clss).to.equal("object");
      });
      it("database", () => {
        expect(typeof database).to.equal("object");
      });
      it("validation", () => {
        expect(typeof validation).to.equal("object");
      });
    });
});
