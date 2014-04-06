/**
 * Module dependencies
 */

var _ = require('lodash');
var Adapter = require('../Adapter');
var Database = require('../Database');
var Model = require('../Model');
var Transaction = require('../Transaction');




/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Databases.  Most applications will only
 * instantiate one ORM.
 *
 * @constructor
 * @param {Object} opts
 */
function ORM (opts) {
  opts = opts || {};

  this.adapters = opts.adapters || [];
  this.databases = opts.databases || [];
  this.models = opts.models || [];
}


/**
 * Transaction
 *
 * orm.transaction([User, Kitten], function (User, Kitten, cb) {
 *   // do stuff
 *   cb();
 * }).exec(function (err) {
 *   // check for errors
 *   // if not, transation was safely committed
 * });
 *
 * @param  {Array{Model}}   modelsInvolved
 * @param  {Function} fn  ({Model}, {Model}, ..., {Function})
 * @return {Deferred}
 */
ORM.prototype.transaction = function ( modelsInvolved, transactionalLogic ) {

  // TODO: validate usage of `modelsInvolved` and `transactionalLogic`

  // Return deferred object that runs the transaction
  var transaction = new Transaction(modelsInvolved, transactionalLogic);
  return new Deferred(transaction.runner);
};


/**
 * Migrate all Databases in this ORM instance.
 * @param {Function} cb
 */
ORM.prototype.refresh = function (cb) {
  // TODO
  cb();
};


// Ontology definition/modification
// These functions should work at any time-- including runtime.
ORM.prototype.identifyModel = function (identity, definition) {
  this.models.push(new Model(definition));
  return this;
};
ORM.prototype.identifyDatabase = function (identity, definition) {
  this.models.push(new Database(definition));
  return this;
};
ORM.prototype.identifyAdapter = function (identity, definition) {
  this.adapters.push(new Adapter(definition));
  return this;
};
ORM.prototype.forgetModel = function (identity) {
  _.remove(this.models, { identity: identity });
  return this;
};
ORM.prototype.forgetAdapter = function (identity) {
  _.remove(this.adapters, { identity: identity });
  return this;
};
ORM.prototype.forgetDatabase = function (identity) {
  _.remove(this.databases, { identity: identity });
  return this;
};


module.exports = ORM;
