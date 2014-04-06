
/**
 * Construct a Database.
 * (aka "Connection")
 *
 * Each Database instance maintains its own options,
 * which include configuration for a particular adapter.
 * Initial default options cascade down from the parent ORM
 * instance.
 *
 * In most cases, a Database instance also contains a set of
 * one or more Model(s).
 *
 * @constructor
 * @param {Object} opts
 */
function Database (opts) {
  opts = opts || {};
}


/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Database.
 */

Database.prototype.schemaDiff = function () {};


/**
 * Modify the structure (and any existing data) of the underlying,
 * adapter-level data store to match the in-memory schema of this
 * Database.
 *
 * Note:
 * This method honors the `migrate` option (safe, drop, or alter)
 * when working with existing data.
 */
Database.prototype.migrate = function () {};



// Adapter-level methods for migrating data are implemented
// in adapters, not Waterline core.  However, they are listed
// here since we will want to provide access to them directly:
Database.prototype.describe = function () {};
Database.prototype.define = function () {};
Database.prototype.drop = function () {};
Database.prototype.addAttribute = function () {};
Database.prototype.removeAttribute = function () {};
Database.prototype.addIndex = function () {};
Database.prototype.removeIndex = function () {};

module.exports = Database;
