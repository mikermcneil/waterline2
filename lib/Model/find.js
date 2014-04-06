/**
 * Module dependencies
 */

var RecordStream = require('../RecordStream');
var Query = require('../Query');




/**
 * `Model.find()`
 *
 * @return {Query}
 */

module.exports = function find ( /* criteria, callback */ ) {

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

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
