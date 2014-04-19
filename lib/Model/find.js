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
  // ****************************************

  // Instantiate a Query
  var query = this.query({
    operations: criteria
  });

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};
