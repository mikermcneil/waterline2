/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');


/**
 * Query Runner.
 *
 * The query runner traverses the given `operations` tree and runs
 * each one by deducing the appropriate adapter(s), database(s),
 * and method(s) from the given `orm` instance.
 *
 * The query runner generates a QueryCache.  As operations complete,
 * this function iteratively stores its results in the cache.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result RecordStream.
 *
 * @type {Function}
 * @param {Object} operations
 * @param {ORM} orm
 * @return {QueryCache}
 */

module.exports = function runner (operations, orm) {
  return {
    operation: 'find',
    parameters: {
      where: {}
    }
  };
};
