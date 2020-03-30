// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as utils from "../utils";

import * as mocks from "./mocks";

describe("utils", () => {

  describe("typecastFn", () => {
    const fn = utils.typecastFn;

    it("typecase string", () => {
      const castString = fn('string');
      expect(castString('some_string')).to.equal("some_string");
      expect(castString('123')).to.equal("123");
      expect(castString('true')).to.equal("true");
    });

    it("typecase number", () => {
      const castNumber = fn('number');
      expect(castNumber('123')).to.equal(123);
      expect(castNumber('-123')).to.equal(-123);
      expect(castNumber('12.34')).to.equal(12.34);
      expect(castNumber('-0.978')).to.equal(-0.978);
      expect(castNumber('0b110011010')).to.equal(410);
      expect(castNumber('0o4732')).to.equal(2522);
      expect(castNumber('0xb7e8')).to.equal(47080);
      expect(castNumber('2e3')).to.equal(2000);
      expect(castNumber('2e-3')).to.equal(0.002);
      expect(isNaN(castNumber('some_string'))).to.equal(true);
    });

    it("typecase boolean", () => {
      const castBoolean = fn('boolean');
      expect(castBoolean('')).to.equal(false);
      expect(castBoolean('0')).to.equal(false);
      expect(castBoolean('f')).to.equal(false);
      expect(castBoolean('false')).to.equal(false);
      expect(castBoolean('true')).to.equal(true);
    });

    it("typecase other", () => {
      const fnArg = () => true;
      const args = ['some_string', '123', 'true', '123', '-123', '12.34', '-0.978', '0b110011010', '0o4732', '0xb7e8', '2e3', '2e-3', 'some_string', '', '0', 'f', 'false', 'true', null, undefined, Infinity, fnArg]
      args.forEach(arg => {
        expect(fn('{}')(arg)).to.equal(arg);
        expect(fn('null')(arg)).to.equal(arg);
        expect(fn('')(arg)).to.equal(arg);
      })
    });


  });

  describe("validator modifications", () => {
    const original = mocks.test_keyed_table;
    const bizarro = utils.modifyValidator(original);
    const alpha = 'string';
    const bravo = 123;
    const charlie = true;
    const mike = 'a string'
    const recordValid = { alpha, bravo, charlie, mike};
    const recordBadTypes = { alpha: 123, bravo: false, charlie: 'some string'};

    const getMessage = (item: any) => item.error.details[0].message

    it("original works as expected", () => {
      const noAlpha = original.validate({bravo, charlie});
      expect(getMessage(noAlpha)).to.equal('"alpha" is required');

      const noBravo = original.validate({alpha, charlie});
      expect(getMessage(noBravo)).to.equal('"bravo" is required');

      const noCharlie = original.validate({alpha, bravo});
      expect(getMessage(noCharlie)).to.equal('"charlie" is required');

      const success = original.validate(recordValid);
      expect(success.error).to.equal(undefined);

      const failure1 = original.validate({...recordBadTypes});
      expect(getMessage(failure1)).to.equal('"alpha" must be a string');

      const failure2 = original.validate({...recordBadTypes, alpha});
      expect(getMessage(failure2)).to.equal('"bravo" must be a number');

      const failure3 = original.validate({...recordBadTypes, alpha, bravo});
      expect(getMessage(failure3)).to.equal('"charlie" must be a boolean');

    });

    it("modified (requirements removed)", () => {
      const noAlpha = bizarro.validate({bravo, charlie});
      expect(noAlpha.error).to.equal(undefined);

      const noBravo = bizarro.validate({alpha, charlie});
      expect(noBravo.error).to.equal(undefined);

      const noCharlie = bizarro.validate({alpha, bravo});
      expect(noCharlie.error).to.equal(undefined);

      const success = bizarro.validate(recordValid);
      expect(success.error).to.equal(undefined);

      const failure1 = bizarro.validate({...recordBadTypes});
      expect(getMessage(failure1)).to.equal('"alpha" must be a string');

      const failure2 = bizarro.validate({...recordBadTypes, alpha});
      expect(getMessage(failure2)).to.equal('"bravo" must be a number');

      const failure3 = bizarro.validate({...recordBadTypes, alpha, bravo});
      expect(getMessage(failure3)).to.equal('"charlie" must be a boolean');

    });
  
  });

  describe("some validatorInspector", () => {
    const fn = utils.validatorInspector;

    it("inspect original validator", () => {

      const describeOriginal = fn(mocks.test_keyed_table);
      Object.entries(mocks.initDescribeOriginal).forEach(([key, value]) => {
        const { type, required, geoqueryType, softDeleteFlag } = value;
        expect(describeOriginal[key].type).to.equal(type);
        expect(describeOriginal[key].required).to.equal(required);
        expect(describeOriginal[key].geoqueryType).to.equal(geoqueryType);
        expect(describeOriginal[key].softDeleteFlag).to.equal(softDeleteFlag);
        expect(describeOriginal[key].typecast).to.equal(utils.typecastFn(type));
  
        const validation = describeOriginal[key].validate(mocks.validationInputs.input[type])
        expect(validation.value).to.equal(mocks.validationInputs.output[type]);
      })
  
    });
    
    it("inspect mutated validator", () => {

      const describeBizarro = fn(utils.modifyValidator(mocks.test_keyed_table));
      Object.entries(mocks.initDescribeBizarro).forEach(([key, value]) => {
        const { type, required, geoqueryType, softDeleteFlag } = value;
        expect(describeBizarro[key].type).to.equal(type);
        expect(describeBizarro[key].required).to.equal(required);
        expect(describeBizarro[key].geoqueryType).to.equal(geoqueryType);
        expect(describeBizarro[key].softDeleteFlag).to.equal(softDeleteFlag);
        expect(describeBizarro[key].typecast).to.equal(utils.typecastFn(type));

        const validation = describeBizarro[key].validate(mocks.validationInputs.input[type])
        expect(validation.value).to.equal(mocks.validationInputs.output[type]);
      })
      
    });

  });









  describe("error_message_invalid_value", () => {
    it("replaces `value` with field", () => {
      const error = new Error('go "value"');
      const field = 'braves';
      
      const fn = utils.error_message_invalid_value;
      expect(fn(error, field)).to.equal("go 'braves'");
    });
  });

  describe("generateSearchQueryError", () => {
    const fn = utils.generateSearchQueryError;
    const error = new Error('go "value"');
    const field = 'braves';
    const type = 'type';
    const operation = 'operation';
    const payload = {error, field, type, operation}
    
    it("thrown error", () => {
      const message = fn(payload);
      expect(message).to.equal("go 'braves'")
    });
    it("unsupported field", () => {
      const message = fn({...payload, error: undefined, type: undefined});
      expect(message).to.equal("'braves' is not a supported property on this resource")
    });
    it("unsupported operation", () => {
      const message = fn({...payload, error: undefined});
      expect(message).to.equal("'operation' operation not supported")
    });
  });

  describe("badArgsLengthError", () => {
    it("enforces defined arg lengths", () => {
      const fn = utils.badArgsLengthError;
      expect(fn('range',[1,2,3])).to.equal("'range' operation requires 2 args. 3 were provided.")
    });
  });

  describe("dddddd", () => {
    it("ffffff", () => {
      expect(true).to.equal(true)
    });
  });

  describe("dddddd", () => {
    it("ffffff", () => {
      expect(true).to.equal(true)
    });
  });

  describe("dddddd", () => {
    it("ffffff", () => {
      expect(true).to.equal(true)
    });
  });



});
