/**
 * Module dependencies
 */

var _ = require('lodash');
var _mergeDefaults = require('merge-defaults');
var Query = require('../../Query');




/**
 * Factory method to generate a new Query
 * using this ORM instance.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */
module.exports = function query (opts, worker) {
  return new Query(_mergeDefaults(opts||{}, { orm: this }), worker);
};
