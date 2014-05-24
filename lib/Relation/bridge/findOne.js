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
  // ****************************************

  // Instantiate a Query
  var query = new Query({

    // Pass in custom logic to marshal the expected results
    // from the adapter for this particular method
    // (this is CURRENTLY [May 20, 2014] only called for non-streaming usage)
    parseResults: function (results) {
      return results[0];
    }
  });

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
