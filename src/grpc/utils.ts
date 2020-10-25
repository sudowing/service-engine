// https://github.com/mesg-foundation/mesg-js/blob/238e70e56cc8a35cfc8ffeb1ffa92c3160ff5d87/src/util/encoder.ts

const encodeField = (data, key) => {
  const value = data[key]
  console.log('ENTRYPOINT encodeField')
  console.log(JSON.stringify({data, key, value}))
switch (Object.prototype.toString.call(value)) {
    case '[object Null]':
    case '[object Undefined]':
      return { nullValue: value }
    case '[object Object]':
      return { structValue: {
        fields: encodeFields(value)
      }}
    case '[object Array]':
      return { listValue: {
        values: value.map((k, i) => encodeField(value, i))
      }}
    case '[object Number]':
      return { numberValue: value }
    case '[object Boolean]':
      return { boolValue: value }
    case '[object String]':
      return { stringValue: value }
    case '[object Date]':
      return { stringValue: (value as Date).toJSON() }
    default:
      throw new Error('not supported')
  }
}

const encodeFields = data => Object.keys(data).reduce((prev, next) => ({
  ...prev,
  [next]: encodeField(data, next)
}), {})

export const encode = (data: { [key: string]: any }) => {
  return {
    fields: encodeFields(data)
  }
}

const decodeField = (field) => {
  const kind = ['list', 'struct', 'string', 'number', 'bool']
    .find(x => field[`${x}Value`] !== undefined) || 'null'
  const value = field[`${kind}Value`]
  switch (kind) {
    case 'string':
    case 'number':
    case 'bool':
    case 'null':
      return value
    case 'struct':
      return decode(value)
    case 'list':
      return Object.keys(value.values).map(x => decodeField(value.values[x]))
    default:
      throw new Error('not implemented')
  }
}

export const decode = (data): { [key: string]: any } => {
  return Object.keys(data.fields).reduce((prev, next) => ({
    ...prev,
    [next]: decodeField(data.fields[next])
  }), {})
}
