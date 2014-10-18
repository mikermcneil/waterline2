/**
 * Module dependencies
 */

var _ = require('lodash');
var _mergeDefaults = require('merge-defaults');

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
  _mergeDefaults(definition, {
    attributes: {}
  });

  // Merge properties into the Relation instance itself,
  // unless they are already defined.
  _mergeDefaults(this, definition);

  // Set entity type (might be 'junction' or 'model')
  this.entity = this.constructor.name.toLowerCase();

}


// Qualifier
Relation.isRelation = WLEntity.qualifier;

// Semantics
Relation.prototype.query = require('./Relation.prototype.query');
Relation.prototype.transaction = require('./Relation.prototype.transaction');
Relation.prototype.bootstrap = require('./Relation.prototype.bootstrap');
Relation.prototype.refresh = require('./Relation.prototype.refresh');

// Base CRUD methods
Relation.prototype.find = require('./bridge-methods/find');
Relation.prototype.create = require('./bridge-methods/create');
Relation.prototype.update = require('./bridge-methods/update');
Relation.prototype.destroy = require('./bridge-methods/destroy');

// Convenience methods
Relation.prototype.findOne = require('./bridge-methods/findOne');

// Compound methods
Relation.prototype.findOrCreate = require('./bridge-methods/findOrCreate');
Relation.prototype.updateOrCreate = require('./bridge-methods/updateOrCreate');

// DDL methods
Relation.prototype.describe = require('./bridge-methods/describe');
Relation.prototype.drop = require('./bridge-methods/drop');
Relation.prototype.addField = require('./bridge-methods/addField');
Relation.prototype.removeField = require('./bridge-methods/removeField');

// Raw private methods
// -- These should not be used directly; the API may change. --
// -- You have been warned! --
Relation.prototype._findRaw = require('./bridge-methods/_findRaw');
Relation.prototype._findAndJoinRaw = require('./bridge-methods/_findAndJoinRaw');
Relation.prototype._findWhoseRaw = require('./bridge-methods/_findWhoseRaw');
Relation.prototype._updateRaw = require('./bridge-methods/_updateRaw');
Relation.prototype._destroyRaw = require('./bridge-methods/_destroyRaw');
Relation.prototype._createRaw = require('./bridge-methods/_createRaw');

// Raw private methods EXCLUSIVELY for adapters implementing
// the original (<2.0.0) Waterline adapter API
Relation.prototype._joinRaw = require('./bridge-methods/_joinRaw');
Relation.prototype._createEachRaw = require('./bridge-methods/_createEachRaw');



// Accessor methods

/**
 * #Relation.prototype.getAdapter()
 *
 * Look up the adapter instance used by this model's datastore.
 *
 * @return {Adapter}
 *
 * @api public
 */

Relation.prototype.getAdapter = function getAdapter () {
  try {
    return this.getDatastore().getAdapter();
  }
  catch (e) {
    return null;
  }
};


/**
 * #Relation.prototype.getRelation()
 *
 * @return {Relation}
 *
 * @api public
 */

Relation.prototype.getRelation = function getRelation () {
  return this;
};

/**
 * #Relation.prototype.getDatastore()
 *
 * Look up the datastore instance this model belongs to.
 *
 * @return {Datastore}
 *
 * @api public
 */

Relation.prototype.getDatastore = function getDatastore () {
  try {
    return this.orm.getDatastore(this.datastore);
  }
  catch (e) {
    return null;
  }
};


/**
 * #Relation.prototype.getAssociationRule()
 *
 * Get the association rule for the given attribute.
 *
 * @this  {Relation}
 * @param  {String} attrName
 * @return {AssociationRule}
 * @api private
 */

Relation.prototype.getAssociationRule = function getAssociationRule (attrName) {
  // console.log('For',this.identity, '(a '+this.entity+'), this.associationRules ==>',this.associationRules);
  return _.find(this.associationRules, { attrName: attrName });
};


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
