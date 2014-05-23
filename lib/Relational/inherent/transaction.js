/**
 * #Relational.prototype.transaction()
 *
 * Build an atomic version of this relation in order to perform
 * some async transactional logic.
 *
 * @param  {Function} cb  ({AtomicRelational}, {Function})
 * @return {Deferred}
 *
 * @api private
 */

module.exports = function getTransactional (cb){
  cb(new Error('Not implemented yet!'));
};
