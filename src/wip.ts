import * as Joi from "@hapi/joi";

// import { UNDERSCORE_IDS, UNDERSCORE_BYKEY } from "./const";
import * as utils from "./utils";

const v = Joi.object({
  alpha: Joi.string().required(),
  bravo: Joi.string(),
  charlie: Joi.number(),
  // delta: Joi.number().integer(),
  echo: Joi.boolean(),
  // foxtrot: Joi.string(),
  // golf: Joi.string(),
  hotel: Joi.string().required(),
});

const weakValidator = utils.validatorInspector(utils.modifyValidator(v));

// const mainValidator = utils.validatorInspector(v);


// const query = {
//   field_gt: "field__gt",
//   field_gte: "field__gte",
//   field_lt: "field__lt",
//   field_lte: "field__lte",
//   field_not: "field__not",
//   field_range: "field__range",
//   field_in: "field__in",
//   field_not_in: "field__not_in",
//   field_like: "field__like",
//   field_or: "field__or",
//   field_geo_bbox: "field__geo_bbox",
//   field_geo_radius: "field__geo_radius",
//   field_geo_polygon: "field__geo_polygon",
//   field_geo_geojson: "field__geo_geojson",
//   "field.gt": "field.gt",
//   "field.gte": "field.gte",
//   "field.lt": "field.lt",
//   "field.lte": "field.lte",
//   "field.not": "field.not",
//   "field.range": "field.range",
//   "field.in": "field.in",
//   "field.not_in": "field.not_in",
//   "field.like": "field.like",
//   "field.or": "field.or",
//   "field.geo_bbox": "field.geo_bbox",
//   "field.geo_radius": "field.geo_radius",
//   "field.geo_polygon": "field.geo_polygon",
//   "field.geo_geojson": "field.geo_geojson",
// };

// const components = utils.queryParser(query);

// console.log("**********");
// console.log("oooo.components");
// console.log(components);
// console.log("**********");



const demo = {
  alpha: 'alpha',
  bravo: 'bravo',
  charlie: '42',
  echo: false,
  hotel: 'hotel',
};

// this is how to pull individual keys from object and test it.
// instead of looping -- just use the map directly.
// maybe run as promise all ? 


const validations = Object.entries(demo).map(([field, value]) => weakValidator[field].validate(value));

Promise.all(validations)
.then(console.log)
.catch(err => {
  console.log('err')
  console.log(err)
})




// console.log('**********');
// console.log('oooo.tests');
// console.log(tests);
// console.log('**********');

