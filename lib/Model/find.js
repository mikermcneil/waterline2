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


  // Ensure basic operations set is filled in.
  criteria = criteria || {};
  // TODO: bring this over from wl1.0
  // if ( !criteria.where && !criteria.limit && !criteria.select) {
  //   criteria.where = criteria;
  // }

  // Fill in the `select` using our schema.
  var defaultSelect = _.mapValues(this.attributes, function () {return true;});
  criteria.select = criteria.select || {};
  if (Object.keys(criteria.select).length === 0) {
    criteria.select = defaultSelect;
  }
  // console.log('find():select:',criteria.select);
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
