/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../util/prettyInstance');



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
 * @param {Object} definition
 */
function Database (definition) {
  definition = definition || {};

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  // Merge `definition` into the Database instance itself,
  // unless they are already defined.
  _.defaults(this, definition);
}


/**
 * Static qualifier method
 * @param  {Database?}  obj
 * @return {Boolean}
 */
Database.isDatabase = function isDatabase(obj) {
  return typeof obj === 'object' && obj instanceof Database;
};


/**
 * Look up the live Adapter instance for this Database.
 *
 * @return {Adapter}
 */
Database.prototype.getAdapter = function () {
  return _.find(this.orm.adapters, { identity: this.adapter });
};


/**
 * Return self
 *
 * @return {Database}
 */
Database.prototype.getDatabase = function () { return this; };


/**
 * @return {Array{Model}}
 */
Database.prototype.getModels = function () {
  // TODO:
};


/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Database.
 */

Database.prototype.getSchemaDiff = function () {};


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
Database.prototype.define = require('./define');
Database.prototype.addIndex = require('./addIndex');
Database.prototype.removeIndex = require('./removeIndex');

// Convenience methods (also on models)
Database.prototype.describe = require('./describe');
Database.prototype.drop = require('./drop');

// Presentation
Database.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Database <'+this.identity+'>');
};


module.exports = Database;
