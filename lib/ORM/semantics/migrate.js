/**
 * #ORM.prototype.migrate()
 *
 * Migrate all Datastores in this ORM instance.
 * Alters physical collections to make them match the current
 * in-memory ontology.
 *
 * Modifies the structure (and any existing data) of the underlying,
 * adapter-level datastores to match the in-memory ontology.
 *
 * Note:
 * The migrate interface honors the `migrate` option (safe, drop, or alter)
 * when working with existing data.
 *
 * @param {Function} cb
 * @api public
 */

module.exports = function migrateORM (cb) {
  cb(new Error('Not implemented yet!'));
};
