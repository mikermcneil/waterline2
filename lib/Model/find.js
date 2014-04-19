/**
 * Module dependencies
 */

var RecordStream = require('../RecordStream');
var Query = require('../Query');
var _ = require('lodash');
_.defaults = require('merge-defaults');



/**
 * `Model.find()`
 *
 * @return {Query}
 */

module.exports = function find ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var criteria = arguments[0];
  var callback = arguments[1];
  var adapter = this.getAdapter();
  // ****************************************

  // Instantiate a Query
  var query = this.query({
    operations: criteria
  }, function (cb) {

    // Now plug this Query into the adapter
    // TODO: replace with Adapter.wrap() usage
    adapter.find(query.operations, cb);
  });

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
