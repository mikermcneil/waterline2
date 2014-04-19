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
  var criteria = arguments[0];
  var callback;

  // Instantiate a Query
  var query = this.query();
  console.log(query);

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
