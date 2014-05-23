/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var WLEntity = require('root-require')('standalone/WLEntity');


/**
 * @constructor
 */
function Relational (definition) {

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

  // Merge properties into the Relational instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);
}


// Qualifier
Relational.isRelational = WLEntity.qualifier;


// Access an association rule
Relational.prototype.getAssociationRule = require('./getAssociationRule');

// Inherent methods
Relational.prototype.refresh = require('./inherent/refresh');
Relational.prototype.getAdapter = require('./inherent/getAdapter');
Relational.prototype.getDatastore = require('./inherent/getDatastore');
Relational.prototype.getModel = require('./inherent/getModel');
Relational.prototype.query = require('./inherent/query');
Relational.prototype.transaction = require('./inherent/transaction');
Relational.prototype.bootstrap = require('./inherent/bootstrap');

// Base CRUD methods
Relational.prototype.find = require('./bridge/find');
Relational.prototype.create = require('./bridge/create');
Relational.prototype.update = require('./bridge/update');
Relational.prototype.destroy = require('./bridge/destroy');

// Convenience methods
Relational.prototype.findOne = require('./bridge/findOne');

// Compound methods
Relational.prototype.findOrCreate = require('./bridge/findOrCreate');
Relational.prototype.updateOrCreate = require('./bridge/updateOrCreate');

// DDL methods
Relational.prototype.describe = require('./bridge/describe');
Relational.prototype.drop = require('./bridge/drop');
Relational.prototype.addAttr = require('./bridge/addAttr');
Relational.prototype.removeAttr = require('./bridge/removeAttr');

// Raw private methods
// -- These should not be used directly; the API may change. --
// -- You have been warned! --
Relational.prototype._findRaw = require('./bridge/_findRaw');
Relational.prototype._findAndJoinRaw = require('./bridge/_findAndJoinRaw');
Relational.prototype._findWhoseRaw = require('./bridge/_findWhoseRaw');
Relational.prototype._updateRaw = require('./bridge/_updateRaw');
Relational.prototype._destroyRaw = require('./bridge/_destroyRaw');
Relational.prototype._createRaw = require('./bridge/_createRaw');

// Raw private methods EXCLUSIVELY for adapters implementing
// the original (<2.0.0) Waterline adapter API
Relational.prototype._joinRaw = require('./bridge/_joinRaw');
Relational.prototype._createEachRaw = require('./bridge/_createEachRaw');

// Presentation
Relational.prototype.inspect = require('./inherent/inspect');


module.exports = Relational;
