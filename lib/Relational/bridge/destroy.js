/**
 * Module dependencies
 */

var Query = require('../../Query');



/**
 * `Relational.prototype.destroy()`
 *
 * @return {Query}
 */
module.exports = function ( /* criteria, callback */ ) {

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
