/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var WLEntity = require('root-require')('standalone/WLEntity');
var prettyInstance = require('root-require')('standalone/pretty-instance');


/**
 * Relation
 *
 * Constructs a Relation, the abstract parent class for Model and Junction.
 * (i.e. you shouldn't ever need/want to "new up" a Relation directly)
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 * @constructor
 * @abstract
 */
function Relation (definition) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  definition = definition || {};
  _.defaultsDeep(definition, {
    attributes: {}
  });

  // Merge properties into the Relation instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);

  // Set entity type (might be 'junction' or 'model')
  this.entity = this.constructor.name.toLowerCase();

}


// Qualifier
Relation.isRelation = WLEntity.qualifier;



// Accessor methods
Relation.prototype.getAdapter = require('./accessors/getAdapter');
Relation.prototype.getDatastore = require('./accessors/getDatastore');
Relation.prototype.getRelation = require('./accessors/getRelation');

// Access an association rule
Relation.prototype.getAssociationRule = require('./accessors/getAssociationRule');

// Semantics
Relation.prototype.query = require('./semantics/query');
Relation.prototype.transaction = require('./semantics/transaction');
Relation.prototype.bootstrap = require('./semantics/bootstrap');
Relation.prototype.refresh = require('./semantics/refresh');

// Base CRUD methods
Relation.prototype.find = require('./bridge/find');
Relation.prototype.create = require('./bridge/create');
Relation.prototype.update = require('./bridge/update');
Relation.prototype.destroy = require('./bridge/destroy');

// Convenience methods
Relation.prototype.findOne = require('./bridge/findOne');

// Compound methods
Relation.prototype.findOrCreate = require('./bridge/findOrCreate');
Relation.prototype.updateOrCreate = require('./bridge/updateOrCreate');

// DDL methods
Relation.prototype.describe = require('./bridge/describe');
Relation.prototype.drop = require('./bridge/drop');
Relation.prototype.addField = require('./bridge/addField');
Relation.prototype.removeField = require('./bridge/removeField');

// Raw private methods
// -- These should not be used directly; the API may change. --
// -- You have been warned! --
Relation.prototype._findRaw = require('./bridge/_findRaw');
Relation.prototype._findAndJoinRaw = require('./bridge/_findAndJoinRaw');
Relation.prototype._findWhoseRaw = require('./bridge/_findWhoseRaw');
Relation.prototype._updateRaw = require('./bridge/_updateRaw');
Relation.prototype._destroyRaw = require('./bridge/_destroyRaw');
Relation.prototype._createRaw = require('./bridge/_createRaw');

// Raw private methods EXCLUSIVELY for adapters implementing
// the original (<2.0.0) Waterline adapter API
Relation.prototype._joinRaw = require('./bridge/_joinRaw');
Relation.prototype._createEachRaw = require('./bridge/_createEachRaw');


/**
 * #Relation.prototype.inspect()
 *
 * @return {String} that will be used when displaying
 *                  a Relation instance via `util.inspect`,
 *                  `console.log`, etc.
 *
 * @api private
 */

Relation.prototype.inspect = function inspectRelation () {
  var props = {
    attributes: this.attributes
  };
  if (this.datastore) { props.datastore = this.datastore; }
  if (this.getAdapter()) { props.adapter = this.getAdapter().identity; }
  var className = this.constructor.name;
  return prettyInstance(this, props, className+' <'+(this.globalID || this.identity)+'>');
};


module.exports = Relation;
