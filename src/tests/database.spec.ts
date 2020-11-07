// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as database from "../database";

describe("database", () => {
  describe("simply get them represented on the coverage report", () => {

    it("exists", () => {
      expect(typeof database).to.equal("object");
    });

  });
});
