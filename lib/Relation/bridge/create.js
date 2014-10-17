/**
 * Module dependencies
 */

var _ = require('lodash');
var Query = require('../../Query');


/**
 * `Relation.prototype.create()`
 *
 * @return {Query}
 */
module.exports = function create ( /* values, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var values = arguments[0];
  var callback = arguments[1];
  // ****************************************


  // `values` should be a plain object (i.e. not an array).
  // (use `createEach()` for arrays, or stream data directly into the relation)
  if (_.isArray(values)) {
    // TODO: do an error here instead
    return this.createEach(values, callback);
  }
  // Now that we're sure `values` is an object,
  // convert it into a single-item array.
  values = [ values ];


  // Instantiate a Query
  var query = this.query({

    adapterMethod: '_createRaw',

    raw: true,

    values: values,

    // Trim off the first result
    // (since `.create()` inserts a single record)
    parseResults: function (results) {
      return results[0];
    }
  });


  // If `callback` was specified, call `.exec()` immediately.
  if (callback) {
    query.exec(callback);
  }

  return query;
};
