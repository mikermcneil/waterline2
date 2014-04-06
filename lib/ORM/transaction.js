/**
 * Module dependencies
 */

var Deferred = require('../Deferred');
var Transaction = require('../Transaction');


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

module.exports = function transaction ( modelsInvolved, transactionalLogic ) {

  // TODO: validate usage of `modelsInvolved` and `transactionalLogic`

  // Return deferred object that runs the transaction
  var transaction = new Transaction(modelsInvolved, transactionalLogic);
  return new Deferred(transaction.runner);
};
