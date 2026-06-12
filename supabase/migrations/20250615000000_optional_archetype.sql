-- archetype_id on node_catalog is optional (nullable FK).
-- Node types can be defined via propertySchema alone; archetype deviation gate applies only when set.

ALTER TABLE node_catalog
  DROP CONSTRAINT IF EXISTS node_catalog_archetype_id_archetypes_id_fk;

ALTER TABLE node_catalog
  ALTER COLUMN archetype_id DROP NOT NULL;

ALTER TABLE node_catalog
  ADD CONSTRAINT node_catalog_archetype_id_archetypes_id_fk
  FOREIGN KEY (archetype_id) REFERENCES archetypes(id)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
