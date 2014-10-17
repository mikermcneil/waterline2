/**
 * Module dependencies
 */

var Query = require('../../Query');



/**
 * `Relation.prototype.destroy()`
 *
 * @return {Query}
 */
module.exports = function ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var criteria = arguments[0];
  var callback = arguments[1];
  // ****************************************


  // Instantiate a Query
  var query = this.query({

    adapterMethod: '_destroyRaw',

    criteria: criteria

  });

  // // If `criteria` was specified, it's like calling the relevant
  // // Query modifier method(s) immediately.
  // if (criteria) {
  //   query.options({ criteria: criteria });
  // }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) {
    query.exec(callback);
  }

  return query;
};
