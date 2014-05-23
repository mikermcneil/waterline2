/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var WLEntity = require('root-require')('standalone/WLEntity');



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
 *
 * @api public
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

// Qualifier
Model.isModel = WLEntity.qualifier;

// Access an association rule
Model.prototype.getAssociationRule = require('./getAssociationRule');

// Inherent methods
Model.prototype.refresh = require('./inherent/refresh');
Model.prototype.getAdapter = require('./inherent/getAdapter');
Model.prototype.getDatastore = require('./inherent/getDatastore');
Model.prototype.getModel = require('./inherent/getModel');
Model.prototype.query = require('./inherent/query');
Model.prototype.transaction = require('./inherent/transaction');
Model.prototype.bootstrap = require('./inherent/bootstrap');

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

// Presentation
Model.prototype.inspect = require('./inherent/inspect');

module.exports = Model;
