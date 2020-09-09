// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as utils from "../utils";

import * as mocks from "./mocks";

describe("utils", () => {
  describe("typecastFn", () => {
    const fn = utils.typecastFn;

    it("typecase string", () => {
      const castString = fn("string");
      expect(castString("some_string")).to.equal("some_string");
      expect(castString("123")).to.equal("123");
      expect(castString("true")).to.equal("true");
    });

    it("typecase number", () => {
      const castNumber = fn("number");
      expect(castNumber("123")).to.equal(123);
      expect(castNumber("-123")).to.equal(-123);
      expect(castNumber("12.34")).to.equal(12.34);
      expect(castNumber("-0.978")).to.equal(-0.978);
      expect(castNumber("0b110011010")).to.equal(410);
      expect(castNumber("0o4732")).to.equal(2522);
      expect(castNumber("0xb7e8")).to.equal(47080);
      expect(castNumber("2e3")).to.equal(2000);
      expect(castNumber("2e-3")).to.equal(0.002);
      expect(isNaN(castNumber("some_string"))).to.equal(true);
    });

    it("typecase boolean", () => {
      const castBoolean = fn("boolean");
      expect(castBoolean("")).to.equal(false);
      expect(castBoolean("0")).to.equal(false);
      expect(castBoolean("f")).to.equal(false);
      expect(castBoolean("false")).to.equal(false);
      expect(castBoolean("true")).to.equal(true);
    });

    it("typecase other", () => {
      const fnArg = () => true;
      const args = [
        "some_string",
        "123",
        "true",
        "123",
        "-123",
        "12.34",
        "-0.978",
        "0b110011010",
        "0o4732",
        "0xb7e8",
        "2e3",
        "2e-3",
        "some_string",
        "",
        "0",
        "f",
        "false",
        "true",
        null,
        undefined,
        Infinity,
        fnArg,
      ];
      args.forEach((arg) => {
        expect(fn("{}")(arg)).to.equal(arg);
        expect(fn("null")(arg)).to.equal(arg);
        expect(fn("")(arg)).to.equal(arg);
      });
    });
  });

  describe("validator modifications", () => {
    const original = mocks.testKeyedTable;
    const bizarro = utils.modifyValidator(original, "read");
    const alpha = "string";
    const bravo = 123;
    const charlie = true;
    const mike = "a string";
    const recordValid = { alpha, bravo, charlie, mike };
    const recordBadTypes = { alpha: 123, bravo: false, charlie: "some string" };

    const getMessage = (item: any) => item.error.details[0].message;

    it("original works as expected", () => {
      const noAlpha = original.validate({ bravo, charlie });
      expect(noAlpha.error).to.equal(undefined);

      const noBravo = original.validate({ alpha, charlie });
      expect(noBravo.error).to.equal(undefined);

      const noCharlie = original.validate({ alpha, bravo });
      expect(noCharlie.error).to.equal(undefined);

      const success = original.validate(recordValid);
      expect(success.error).to.equal(undefined);

      const failure1 = original.validate({ ...recordBadTypes });
      expect(getMessage(failure1)).to.equal('"alpha" must be a string');

      const failure2 = original.validate({ ...recordBadTypes, alpha });
      expect(getMessage(failure2)).to.equal('"bravo" must be a number');

      const failure3 = original.validate({ ...recordBadTypes, alpha, bravo });
      expect(getMessage(failure3)).to.equal('"charlie" must be a boolean');
    });

    it("modified (requirements removed)", () => {
      const noAlpha = bizarro.validate({ bravo, charlie });
      expect(getMessage(noAlpha)).to.equal('"alpha" is required');

      const noBravo = bizarro.validate({ alpha, charlie });
      expect(getMessage(noBravo)).to.equal('"bravo" is required');

      const noCharlie = bizarro.validate({ alpha, bravo });
      expect(getMessage(noCharlie)).to.equal('"charlie" is required');

      const success = bizarro.validate(recordValid);
      expect(success.error).to.equal(undefined);

      const failure1 = bizarro.validate({ ...recordBadTypes });
      expect(getMessage(failure1)).to.equal('"alpha" must be a string');

      const failure2 = bizarro.validate({ ...recordBadTypes, alpha });
      expect(getMessage(failure2)).to.equal('"bravo" must be a number');

      const failure3 = bizarro.validate({ ...recordBadTypes, alpha, bravo });
      expect(getMessage(failure3)).to.equal('"charlie" must be a boolean');
    });
  });

  describe("some validatorInspector", () => {
    const fn = utils.validatorInspector;

    it("inspect original validator", async () => {
      const describeOriginal = fn(
        utils.modifyValidator(mocks.testKeyedTable, "read")
      );
      Object.entries(mocks.initDescribeOriginal).forEach(
        async ([key, value]) => {
          const { type, required, geoqueryType, softDeleteFlag } = value;
          expect(describeOriginal[key].type).to.equal(type);
          expect(describeOriginal[key].required).to.equal(required);
          expect(describeOriginal[key].geoqueryType).to.equal(geoqueryType);
          expect(describeOriginal[key].softDeleteFlag).to.equal(softDeleteFlag);
          expect(describeOriginal[key].typecast).to.equal(
            utils.typecastFn(type)
          );

          // this is asyncValidate now
          const validation = await describeOriginal[key].validate(
            mocks.validationInputs.input[type]
          );

          expect(validation).to.equal(mocks.validationInputs.output[type]);
        }
      );
    });

    it("inspect mutated validator", async () => {
      const describeBizarro = fn(mocks.testKeyedTable);
      Object.entries(mocks.initDescribeBizarro).forEach(
        async ([key, value]) => {
          const { type, required, geoqueryType, softDeleteFlag } = value;
          expect(describeBizarro[key].type).to.equal(type);
          expect(describeBizarro[key].required).to.equal(required);
          expect(describeBizarro[key].geoqueryType).to.equal(geoqueryType);
          expect(describeBizarro[key].softDeleteFlag).to.equal(softDeleteFlag);
          expect(describeBizarro[key].typecast).to.equal(
            utils.typecastFn(type)
          );

          // this is asyncValidate now
          const validation = await describeBizarro[key].validate(
            mocks.validationInputs.input[type]
          );
          expect(validation).to.equal(mocks.validationInputs.output[type]);
        }
      );
    });
  });

  describe("errorMessageInvalidValue", () => {
    it("replaces `value` with field", () => {
      const field = "atlanta";
      const message = "go braves";

      const fn = utils.errorMessageInvalidValue;
      expect(fn(field, message)).to.equal("'atlanta': go braves");
    });
  });

  describe("generateSearchQueryError", () => {
    const fn = utils.generateSearchQueryError;
    const error = "play ball";
    const field = "braves";
    const type = "type";
    const operation = "operation";
    const payload = { error, field, type, operation };

    it("thrown error", () => {
      const message = fn(payload);
      expect(message).to.equal("'braves': play ball");
    });
    it("unsupported field", () => {
      const message = fn({ ...payload, error: undefined, type: undefined });
      expect(message).to.equal(
        "'braves' is not a supported property on this resource"
      );
    });
    it("unsupported operation", () => {
      const message = fn({ ...payload, error: undefined });
      expect(message).to.equal("'operation' operation not supported");
    });
  });

  describe("badArgsLengthError", () => {
    it("enforces defined arg lengths", () => {
      const fn = utils.badArgsLengthError;
      expect(fn("range", [1, 2, 3])).to.equal(
        "'range' operation requires 2 args. 3 were provided."
      );
    });
  });

  describe("validArgsforOperation", () => {
    it("reports defined arg lengths", () => {
      const fn = utils.validArgsforOperation;
      expect(fn("range", [1, 2, 3])).to.equal(false);
      expect(fn("range", [1, 2])).to.equal(true);
      expect(fn("not a real operation", [1, 2])).to.equal(true);
    });
  });

  describe("supportMultipleValues", () => {
    it("reports defined arg lengths", () => {
      const fn = utils.supportMultipleValues;
      expect(fn("does not support multiple values")).to.equal(false);
      expect(fn("in")).to.equal(true);
    });
  });

  describe("supportedOperation", () => {
    it("reports supported operations", () => {
      const fn = utils.supportedOperation;
      expect(fn("does not support multiple values")).to.equal(false);
      expect(fn("in")).to.equal(true);
    });
  });

  describe("parseFieldAndOperation", () => {
    it("parses field and operations", () => {
      const fn = utils.parseFieldAndOperation;
      const product1 = fn("field");
      expect(product1.field).to.equal("field");
      expect(product1.operation).to.equal("equal");

      const product2 = fn("field.in");
      expect(product2.field).to.equal("field");
      expect(product2.operation).to.equal("in");
    });
  });

  describe("searchQueryParser", () => {
    const fn = utils.searchQueryParser;

    it("produces errors and components as expected (now async!)", async () => {
      const { errors, components } = await fn(
        mocks.testTable,
        mocks.exampleSearchQuery
      );

      const checkForMocksinTestResults = (
        mockedEntries: string[],
        testResults: any[]
      ) => {
        const testResultsStringified = testResults.map((item) =>
          JSON.stringify(item)
        );
        mockedEntries.forEach((entry) => {
          expect(testResultsStringified.includes(entry)).to.equal(true);
        });
      };

      // ensure all expected mocks are present in the retults
      checkForMocksinTestResults(mocks.exampleParsedSearchQuery.errors, errors);
      checkForMocksinTestResults(
        mocks.exampleParsedSearchQuery.components,
        components
      );
    });
  });
});
