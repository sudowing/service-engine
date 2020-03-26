import * as Joi from "@hapi/joi";
import * as utils from "./utils";

export const JOI_GEOFIELD = Joi.string().invalid('geoquery');

const v = Joi.object({
  alpha: Joi.string().required(),
  bravo: Joi.string(),
  charlie: Joi.number(),
  delta: Joi.number().integer(),
  echo: Joi.boolean(),
  foxtrot: Joi.number(),
  golf: Joi.string(),
  hotel: Joi.string().required(),
  mike: JOI_GEOFIELD,
  november: JOI_GEOFIELD,
  oscar: JOI_GEOFIELD,
  papa: JOI_GEOFIELD,
});

const query = {
  field_gt: "field__gt",
  field_gte: "field__gte",
  field_lt: "field__lt",
  field_lte: "field__lte",
  field_not: "field__not",
  field_range: "field__range",
  field_in: "field__in",
  field_not_in: "field__not_in",
  field_like: "field__like",
  field_or: "field__or",
  field_geo_bbox: "field__geo_bbox",
  field_geo_radius: "field__geo_radius",
  field_geo_polygon: "field__geo_polygon",
  field_geo_geojson: "field__geo_geojson",
  "alpha.gt": "field.gt",
  "bravo.gte": "field.gte",
  "charlie.lt": "field.lt",
  "delta.lte": "field.lte",
  "echo.not": "field.not",
  "foxtrot.range": "5.1,9.7",
  "golf.in": "braves,marlins,nationals,mets,phillies",
  "hotel.not_in": "braves,marlins,nationals,mets,phillies",
  "alpha.like": "field.like",
  "bravo.or": "field.or",
  "mike.geo_bbox": "1.1,2.2,3.3,4.4",
  "november.geo_radius": "1.2,2.3,111000",
  "oscar.geo_polygon": "field.geo_polygon",
  "papa.geo_geojson": "field.geo_geojson",

};

const { components } = utils.queryParser2(v, query);

console.log("**********");
console.log("oooo.components");
console.log(components.length);
console.log("**********");



















// const weakValidator = utils.validatorInspector(utils.modifyValidator(v));

// const mainValidator = utils.validatorInspector(v);


// const demo = {
//   alpha: 'alpha',
//   bravo: 'bravo',
//   charlie: '42',
//   echo: false,
//   hotel: 'hotel',
// };

// this is how to pull individual keys from object and test it.
// instead of looping -- just use the map directly.
// maybe run as promise all ? 

// const hack = (validator, query) => Object.entries(query)
//   .map(([field, value]) => ({
//     field,
//     ...validator[field],
//     ...validator[field].validate(value),
//   }));


// const validations = hack(weakValidator, demo)


// Promise.all(validations)
//   .then(console.log)
//   .catch(err => {
//     console.log('err')
//     console.log(err)
//   });

// var a = [1, 2, 3]
// var b = ['a', 'b', 'c']

// var c = a.map(function(e, i) {
//   return [e, b[i]];
// });

// console.log(c)


// console.log('**********');
// console.log('oooo.tests');
// console.log(tests);
// console.log('**********');





