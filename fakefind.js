/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLFilter = require('waterline-criteria');


/**
 * @param  {Query.constructor} Query
 * @return {Function}
 */
module.exports = function di (Query) {

  /**
   * Used during development of the query engine to fake a
   * `find()` query result set.
   * @param  {Object} operations
   * @return {Query}
   */
  return function stubFind (operations) {

    var q = new Query({
      operations: _.cloneDeep(operations)
    }, function pseudoAdapter(cb) {

      var stubdata = require('./test/fixtures/dataset.fixture');
      var results = WLFilter(operations.from, stubdata, operations).results;
      // console.log('criteria:',operations, 'results:',results);
      return cb(null, results);
    });

    return q;
  };
};
