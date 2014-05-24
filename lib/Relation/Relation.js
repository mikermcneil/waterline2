/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var WLEntity = require('root-require')('standalone/WLEntity');


/**
 * @constructor
 */
function Relation (definition) {

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

  // Merge properties into the Relation instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);
}


// Qualifier
Relation.isRelation = WLEntity.qualifier;


// Access an association rule
Relation.prototype.getAssociationRule = require('./getAssociationRule');

// Inherent methods
Relation.prototype.refresh = require('./inherent/refresh');
Relation.prototype.getAdapter = require('./inherent/getAdapter');
Relation.prototype.getDatastore = require('./inherent/getDatastore');
Relation.prototype.getRelation = require('./inherent/getRelation');
Relation.prototype.query = require('./inherent/query');
Relation.prototype.transaction = require('./inherent/transaction');
Relation.prototype.bootstrap = require('./inherent/bootstrap');

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
Relation.prototype.addAttr = require('./bridge/addAttr');
Relation.prototype.removeAttr = require('./bridge/removeAttr');

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

// Presentation
Relation.prototype.inspect = require('./inherent/inspect');


module.exports = Relation;
