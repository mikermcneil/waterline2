/**
 * Module dependencies
 */

var Query = require('../../Query');



/**
 * `Relation.prototype.find()`
 *
 * @return {Query}
 */

module.exports = function find ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var criteria = arguments[0];
  var callback = arguments[1];
  // ****************************************

  // Instantiate a Query
  var query = this.query({
    criteria: criteria
  });

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
