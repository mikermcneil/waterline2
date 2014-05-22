/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');
var prettyInstance = require('../../util/prettyInstance');



/**
 * Construct a Model.
 * (aka WL1 "Collection")
 *
 * Each Model instance starts off with a `definition`, which typically
 * includes the identity of the Datastore where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 */

function Model (definition) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  definition = definition || {};
  _.defaultsDeep(definition, {
    attributes: {}
  });

  // Normalize `tableName`+`cid`+`identity` --> `cid`
  definition.cid = definition.cid||definition.tableName||definition.identity;

  // Normalize `columnName`+`aid`+attrName --> `aid`
  _.mapValues(definition.attributes, function (attrDef, attrName) {
    attrDef.aid = attrDef.aid||attrDef.columnName||attrName;
    return attrDef;
  });

  // TODO: default `schema` flag based on the adapter

  // Merge properties into the Model instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);

}


// Refresh in-memory state after some kind of ontology change
Model.prototype.refresh = require('./refresh');


// WLEntity interface implementation:
Model.prototype.getAdapter = require('./getAdapter');
Model.prototype.getDatastore = require('./getDatastore');
Model.prototype.getModel = require('./getModel');

// Base query method
Model.prototype.query = require('./query');

// Base CRUD methods
Model.prototype.find = require('./bridge/find');
Model.prototype.create = require('./bridge/create');
Model.prototype.update = require('./bridge/update');
Model.prototype.destroy = require('./bridge/destroy');

// Convenience methods
Model.prototype.findOne = require('./bridge/findOne');

// Compound methods
Model.prototype.findOrCreate = require('./bridge/findOrCreate');
Model.prototype.updateOrCreate = require('./bridge/updateOrCreate');

// DDL methods
Model.prototype.describe = require('./bridge/describe');
Model.prototype.drop = require('./bridge/drop');
Model.prototype.addAttr = require('./bridge/addAttr');
Model.prototype.removeAttr = require('./bridge/removeAttr');

// Raw private methods
// -- These should not be used directly; the API may change. --
// -- You have been warned! --
Model.prototype._findRaw = require('./bridge/_findRaw');
Model.prototype._findAndJoinRaw = require('./bridge/_findAndJoinRaw');
Model.prototype._findWhoseRaw = require('./bridge/_findWhoseRaw');
Model.prototype._updateRaw = require('./bridge/_updateRaw');
Model.prototype._destroyRaw = require('./bridge/_destroyRaw');
Model.prototype._createRaw = require('./bridge/_createRaw');

// Raw private methods EXCLUSIVELY for adapters implementing
// the original (<2.0.0) Waterline adapter API
Model.prototype._joinRaw = require('./bridge/_joinRaw');
Model.prototype._createEachRaw = require('./bridge/_createEachRaw');



/**
 * #Model.prototype.inspect()
 *
 * @return {String} that will be used when displaying
 *                  a Model instance via `util.inspect`,
 *                  `console.log`, etc.
 */
Model.prototype.inspect = function inspect() {
  var props = {
    attributes: this.attributes
  };
  if (this.datastore) { props.datastore = this.datastore; }
  if (this.getAdapter()) { props.adapter = this.getAdapter().identity; }
  return prettyInstance(this, props, 'Model <'+(this.globalID || this.identity)+'>');
};


/**
 * #Model.isModel()
 *
 * @param  {Model?}  obj
 * @return {Boolean}
 * @static
 */
Model.isModel = function isModel(obj) {
  return typeof obj === 'object' && obj instanceof Model;
};

module.exports = Model;
