/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../util/prettyInstance');



/**
 * Construct a Datastore.
 * (aka "Connection")
 *
 * Each Datastore instance maintains its own options,
 * which include configuration for a particular adapter.
 * Initial default options cascade down from the parent ORM
 * instance.
 *
 * In most cases, a Datastore instance also contains a set of
 * one or more Model(s).
 *
 * @constructor
 * @param {Object} definition
 */

function Datastore (definition) {
  definition = definition || {};

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  // Merge `definition` into the Datastore instance itself,
  // unless they are already defined.
  _.defaults(this, definition);
}


/**
 * Qualifier
 * @param  {Datastore?}  obj
 * @return {Boolean}
 * @static
 */
Datastore.isDatastore = function isDatastore(obj) {
  return typeof obj === 'object' && obj instanceof Datastore;
};


/**
 * Look up the live Adapter instance for this Datastore.
 *
 * @return {Adapter}
 */
Datastore.prototype.getAdapter = function () { return this.orm.getAdapter(this.adapter); };


/**
 * Return self
 *
 * @return {Datastore}
 */
Datastore.prototype.getDatastore = function () { return this; };


/**
 * @return {Model[]}
 */
Datastore.prototype.getModels = function () {
  // TODO:
  throw new Error('todo');
};


/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Datastore.
 */

Datastore.prototype.getSchemaDiff = function () {};


/**
 * Modify the structure (and any existing data) of the underlying,
 * adapter-level data store to match the in-memory schema of this
 * Datastore.
 *
 * Note:
 * This method honors the `migrate` option (safe, drop, or alter)
 * when working with existing data.
 */
Datastore.prototype.migrate = function () {};



// Adapter-level methods for migrating data are implemented
// in adapters, not Waterline core.  However, they are listed
// here since we will want to provide access to them directly:
Datastore.prototype.define = require('./define');
Datastore.prototype.addIndex = require('./addIndex');
Datastore.prototype.removeIndex = require('./removeIndex');

// Convenience methods (also on models)
Datastore.prototype.describe = require('./describe');
Datastore.prototype.drop = require('./drop');

// Presentation
Datastore.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Datastore <'+this.identity+'>');
};


module.exports = Datastore;
