// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as dialects from "../dialects";

describe("dialects", () => {
  describe("simply get them represented on the coverage report", () => {
    it("exists", () => {
      expect(typeof dialects).to.equal("object");
    });
  });
});
