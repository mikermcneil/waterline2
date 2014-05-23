/**
 * Module dependencies
 */

//
// ...
//


/**
 * #Datastore.prototype.query()
 *
 * Factory method to generate a new generic Waterline Query.
 *
 * Currently, this is identical to `ORM.prototype.query()`, but
 * it may wrap additional functionality in future versions of
 * Waterline.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */

module.exports = function query (opts, worker) {
  return this.orm.query(opts, worker);
};
