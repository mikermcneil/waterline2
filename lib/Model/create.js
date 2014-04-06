/**
 * Module dependencies
 */

var Query = require('../Query');
var RecordStream = require('../RecordStream');



/**
 * `Model.create()`
 *
 * @return {Query}
 */
module.exports = function create ( /* values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
