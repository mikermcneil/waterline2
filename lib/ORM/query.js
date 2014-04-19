/**
 * Module dependencies
 */

var Query = require('../Query');


/**
 * Factory method to generate a new Query
 * using this ORM instance.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */
module.exports = function query (opts, worker) {
  var q = new Query(opts, worker);
  q._orm = this;
  return q;
};
