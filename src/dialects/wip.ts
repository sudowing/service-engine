// mysql

export const toProtoScalar = (type: string) => {
  switch (type) {
    // 11.1 Numeric Data Types
    case cnst.BIT:
    case cnst.TINYINT:
    case cnst.SMALLINT:
    case cnst.MEDIUMINT:
    case cnst.INT:
    case cnst.INTEGER:
      return "Float";
    // BIGINT
    // DECIMAL
    // DEC
    // NUMERIC
    // FIXED
    // FLOAT
    // DOUBLE
    // DOUBLE PRECISION
    // REAL

    // 11.2 Date and Time Data Types
    // DATE
    // TIME
    // DATETIME
    // TIMESTAMP
    case cnst.YEAR:
      return "Float";

    // 11.3 String Data Types
    // CHAR
    // NATIONAL CHAR
    // NCHAR
    // VARCHAR
    // NATIONAL VARCHAR
    // NVARCHAR
    // BINARY
    // VARBINARY
    // TINYBLOB
    // TINYTEXT
    // BLOB
    // TEXT
    // MEDIUMBLOB
    // MEDIUMTEXT
    // LONGBLOB
    // LONGTEXT
    // ENUM
    // SET

    // 11.4 Spatial Data Types
    // GEOMETRY
    // POINT
    // LINESTRING
    // POLYGON
    // MULTIPOINT
    // MULTILINESTRING
    // MULTIPOLYGON
    // GEOMETRYCOLLECTION
    case cnst.GEOMETRY:
    case cnst.POINT:
    case cnst.LINESTRING:
    case cnst.POLYGON:
    case cnst.MULTIPOINT:
    case cnst.MULTILINESTRING:
    case cnst.MULTIPOLYGON:
    case cnst.GEOMETRYCOLLECTION:
      return "JSONB";
    // 11.5 The JSON Data Type
    // JSON

    default:
      return "String";
  }
};