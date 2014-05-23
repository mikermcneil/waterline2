/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
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
  return new Query(_.defaults(opts||{}, { orm: this }), worker);
};
