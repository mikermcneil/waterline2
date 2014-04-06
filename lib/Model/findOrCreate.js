/**
 * Module dependencies
 */

var Query = require('../Query');
var RecordStream = require('../RecordStream');



/**
 * `Model.findOrCreate()`
 *
 * @return {Query}
 */
module.exports = function findOrCreate ( /* criteria, values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
