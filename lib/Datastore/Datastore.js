/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var _mergeDefaults = require('merge-defaults');

var prettyInstance = require('root-require')('standalone/pretty-instance');
var WLEntity = require('root-require')('standalone/WLEntity');


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
  _mergeDefaults(this, definition);
}

// Qualifier
Datastore.isDatastore = WLEntity.qualifier;

// Accessor methods
/**
 * Look up the live Adapter instance for this Datastore.
 *
 * @return {Adapter}
 */

Datastore.prototype.getAdapter = function () {
  return this.orm.getAdapter(this.adapter);
};
/**
 * Return self
 *
 * @return {Datastore}
 */
Datastore.prototype.getDatastore = function () {
  return this;
};


// Semantics
Datastore.prototype.query = require('./Datastore.prototype.query');
Datastore.prototype.transaction = require('./Datastore.prototype.transaction');
Datastore.prototype.bootstrap = require('./Datastore.prototype.bootstrap');
Datastore.prototype.migrate = require('./Datastore.prototype.migrate');

/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Datastore.
 */

Datastore.prototype.getSchemaDiff = function () {};


// Adapter-level methods for migrating data are implemented
// in adapters, not Waterline core.  However, they are listed
// here since we will want to provide access to them directly:
Datastore.prototype.define = require('./bridge-methods/define');
Datastore.prototype.addIndex = require('./bridge-methods/addIndex');
Datastore.prototype.removeIndex = require('./bridge-methods/removeIndex');
Datastore.prototype.describe = require('./bridge-methods/describe');
Datastore.prototype.drop = require('./bridge-methods/drop');

// Presentation
Datastore.prototype.inspect = function () {
  return prettyInstance(this, _.reduce({
    adapter: this.adapter
  }, function(memo, val, key) {
    return memo+'\n • ' + key + ': ' + util.inspect(val, false, null);
  }, ''), 'Datastore <'+this.identity+'>');
};


module.exports = Datastore;
