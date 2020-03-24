import * as Joi from '@hapi/joi';
import {cloneDeep} from "lodash";

const queryParser = (field, value, operation) => ({
    field,
    operation: operation ? operation : 'equal',
    value,
})

const query = {
    'field_gt': 'field__gt',
    'field_gte': 'field__gte',
    'field_lt': 'field__lt',
    'field_lte': 'field__lte',
    'field_not': 'field__not',
    'field_range': 'field__range',
    'field_in': 'field__in',
    'field_not_in': 'field__not_in',
    'field_like': 'field__like',
    'field_or': 'field__or',
    'field_geo_bbox': 'field__geo_bbox',
    'field_geo_radius': 'field__geo_radius',
    'field_geo_polygon': 'field__geo_polygon',
    'field_geo_geojson': 'field__geo_geojson',
    'field.gt': 'field.gt',
    'field.gte': 'field.gte',
    'field.lt': 'field.lt',
    'field.lte': 'field.lte',
    'field.not': 'field.not',
    'field.range': 'field.range',
    'field.in': 'field.in',
    'field.not_in': 'field.not_in',
    'field.like': 'field.like',
    'field.or': 'field.or',
    'field.geo_bbox': 'field.geo_bbox',
    'field.geo_radius': 'field.geo_radius',
    'field.geo_polygon': 'field.geo_polygon',
    'field.geo_geojson': 'field.geo_geojson',
};

const queryComponents = (query) =>
    Object.entries(query)
        .reduce((accum, [key, value]) => {
            const [field, operation] = key.split('.');
            return [...accum, queryParser(field, value, operation)]
        }, []);


const typecastFn = (type) => {
    switch(type){
        case 'string':
            return String;
        case 'number':
            return Number;
        case 'boolean':
            return Boolean;
        default:
            return (arg) => arg
    }
}

const validatorInspector = (validator) =>
    Array.from(validator['_ids']['_byKey'].values())
        .reduce((accum: object, {id, schema: {type, _flags}}) => ({...accum, [id]: {
            type, required: !!(_flags && _flags.presence), typecast: typecastFn(type)
        }}), {})


const modifyValidator = (validator: any) => {
    const weakValidator = cloneDeep(validator);
    weakValidator['_ids']['_byKey'].forEach(({schema: {_flags}}) => {
        if (_flags && _flags.presence) delete _flags.presence;
    })
    return weakValidator;
};




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

const weakValidator = validatorInspector(modifyValidator(v));
console.log('**********');
console.log('oooo.weakValidator');
console.log(weakValidator);
console.log('**********');

const mainValidator = validatorInspector(v);
console.log('**********');
console.log('oooo.mainValidator');
console.log(mainValidator);
console.log('**********');



/*




query
    #fields=alpha,bravo,charlie
    #subquery?=query
    field.gt
    field.gte
    field.lt
    field.lte
    field.not
    field.range=5-9
    field.in
    field.not_in
    field.like
    field.or
    field.geo_bbox=minLong, minLat, maxLong, maxLat
    field.geo_radius=lat, long, meters
    field.geo_polygon=polygon // also supports multipolygons
    field.geo_geojson=geojson



    if contains `.`

    gt
    gte
    lt
    lte
    not
    range
    in
    not_in
    like
    or
    geo_bbox
    geo_radius
    geo_polygon
    geo_geojson

*/
