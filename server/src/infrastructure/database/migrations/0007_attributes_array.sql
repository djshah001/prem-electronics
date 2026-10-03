-- Migration 0007: Normalize product attributes from Record<string,any> to {name,value}[] array format.
-- The JSONB column type does not change; only existing {} records are converted to [].
-- New records will be inserted with the array format by the application layer.

-- Convert existing products with object-format attributes to the canonical [{name,value}] array.
-- Products that already have array attributes (jsonb_typeof = 'array') are left unchanged.
-- Products with empty object {} get an empty array [].
UPDATE "products"
SET "attributes" = (
  SELECT jsonb_agg(jsonb_build_object('name', key, 'value', value))
  FROM jsonb_each_text("attributes") AS kv(key, value)
)
WHERE jsonb_typeof("attributes") = 'object' AND "attributes" <> 'null'::jsonb AND "attributes" != '[]'::jsonb;

-- Replace any remaining NULL or non-array attributes with empty array default.
UPDATE "products"
SET "attributes" = '[]'::jsonb
WHERE "attributes" IS NULL OR jsonb_typeof("attributes") != 'array';
