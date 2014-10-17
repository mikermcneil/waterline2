/**
 * Module dependencies
 */

var Query = require('../../Query');



/**
 * `Relation.prototype.create()`
 *
 * @return {Query}
 */
module.exports = function create ( /* values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var values = arguments[0];
  var callback = arguments[1];
  // ****************************************

  // Instantiate a Query
  var query = this.query({
    values: values
  });


  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
