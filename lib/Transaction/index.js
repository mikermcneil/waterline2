/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLUsageError = require('../WLError/WLUsageError');



/**
 * Construct a Transaction.
 *
 * @constructor
 * @param {Array{Model}} modelsInvolved
 * @param {Function} transactionalLogic
 */
function Transaction (modelsInvolved, transactionalLogic) {

  var self = this;

  this.start = function (cb) {

    // TODO: check whether a transaction on `modelsInvolved` is possible and ACID-safe.
    var isACIDSafe = true;

    // Determine whether the specified models can be safely
    // used together in an ACID-compliant transaction.
    // (in most cases, if the models are from different Databases,
    //  this is a no-go)
    if ( !isACIDSafe ) {
      return cb(new WLUsageError({ reason: 'Can not run an atomic transaction using specified models.', models: modelsInvolved }));
    }

    cb();
  };


  /**
   * [commit description]
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  this.commit = function (cb) {
    // TODO
  };


  /**
   * [rollback description]
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  this.rollback = function (cb) {
    // TODO
  };


  /**
   * Build a function designed to be called by a Deferred that will
   * run this transaction.
   *
   * @param  {Function} cb [description]
   * @return {Function}
   */
  this.runner = function (cb) {

    // Start transaction
    self.start(function (transactionStartErr) {

      // If transaction fails to start, bail.
      if (transactionStartErr) return cb(transactionStartErr);

      // Now call out to the relevant adapters via the models' databases
      // to run the transaction (`transactionalLogic`) and call `cb` when it finishes.
      return _.partial(transactionalLogic, modelsInvolved.concat(function endTransactionalLogic (err) {

        // The transaction is complete.
        //
        // Possible exit scenarios at this point:
        // (a) success          (commit)
        // (b) failure          (rollback)
        // (c) fiasco/emergency (failed to rollback)
        //
        // (apps should examine `err` to determine the situation)

        // If an error occurs in the transactional logic,
        // attempt to rollback the transaction:
        if (err) {
          return self.rollback(function (seriousRollbackErr) {
            // If rollback fails, this is an "emergency", or "fiasco":
            if (seriousRollbackErr) return cb(new WLError({ code: 'E_ROLLBACKFAILURE', originalError: err }));
            // Otherwise, it's just a normal error and everything was rolled back successfully.
            else return cb(err);
          });
        }

        // If everything worked, try to commit the transaction
        return self.commit(function (commitErr) {
          // If commit fails, this sucks, but at least our data is still consistent.
          // It's just a normal error.
          if (commitErr) return cb(new WLError({ code: 'E_COMMITFAILURE' }));

          // Otherwise, it worked and everything was persisted!
          else return cb();
        });

      }))();

    });

  };
}

module.exports = Transaction;
