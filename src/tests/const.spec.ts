// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as cnst from "../const";

describe("cnst", () => {
  describe("simply get them represented on the coverage report", () => {
    it("exists", () => {
      expect(typeof cnst).to.equal("object");
    });
  });
});
