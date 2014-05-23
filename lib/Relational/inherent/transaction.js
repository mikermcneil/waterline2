/**
 * #Model.prototype.transaction()
 *
 * Build an atomic version of this model in order to perform
 * some async transactional logic.
 *
 * @param  {Function} cb  ({AtomicModel}, {Function})
 * @return {Deferred}
 *
 * @api private
 */

module.exports = function getTransactional (cb){
  cb(new Error('Not implemented yet!'));
};
