/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');

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
  _.defaults(this, definition);
}

// Qualifier
Datastore.isDatastore = WLEntity.qualifier;

// Accessor methods
Datastore.prototype.getAdapter = require('./accessors/getAdapter');
Datastore.prototype.getDatastore = require('./accessors/getDatastore');
Datastore.prototype.getModels = require('./accessors/getModels');

// Semantics
Datastore.prototype.query = require('./semantics/query');
Datastore.prototype.transaction = require('./semantics/transaction');
Datastore.prototype.bootstrap = require('./semantics/bootstrap');
Datastore.prototype.migrate = require('./semantics/migrate');

/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Datastore.
 */

Datastore.prototype.getSchemaDiff = function () {};


// Adapter-level methods for migrating data are implemented
// in adapters, not Waterline core.  However, they are listed
// here since we will want to provide access to them directly:
Datastore.prototype.define = require('./bridge/define');
Datastore.prototype.addIndex = require('./bridge/addIndex');
Datastore.prototype.removeIndex = require('./bridge/removeIndex');
Datastore.prototype.describe = require('./bridge/describe');
Datastore.prototype.drop = require('./bridge/drop');

// Presentation
Datastore.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Datastore <'+this.identity+'>');
};


module.exports = Datastore;
