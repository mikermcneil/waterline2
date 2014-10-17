/**
 * Module dependencies
 */

var Query = require('../../Query');



/**
 * `Relation.prototype.findOne()`
 *
 * @return {Query}
 */
module.exports = function findOne ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var criteria = arguments[0];
  var callback = arguments[1];
  // ****************************************

  // Instantiate a Query
  var query = this.query({

    criteria: criteria,

    // Pass in custom logic to marshal the expected results
    // from the adapter for this particular method
    // (this is CURRENTLY [May 20, 2014] only called for non-streaming usage)
    parseResults: function (results) {
      return results[0];
    }
  });

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
