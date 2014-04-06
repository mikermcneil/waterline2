/**
 * Module dependencies
 */

var _ = require('lodash');
var Deferred = require('../Deferred');
var Model = require('../Model');
var WLUsageError = require('../WLError/WLUsageError');
var Transaction = require('../Transaction');


/**
 * `ORM.prototype.transaction`
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

module.exports = function transaction ( modelsInvolved, transactionalLogic ) {

  // Validate usage
  var validUsage =
  _.isArray(modelsInvolved) &&
  _.all(modelsInvolved, function (model) {
    return _.isObject(model) && model instanceof Model;
  }) &&
  _.isFunction(transactionalLogic);

  if (!validUsage) throw new WLUsageError({reason: 'Invalid usage of `orm.transaction()`'});

  // Return deferred object that runs the transaction
  var transactionInstance = new Transaction(modelsInvolved, transactionalLogic);
  return new Deferred(transactionInstance.runner);
};
