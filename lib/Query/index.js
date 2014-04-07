/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred')();


/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on one or more Databases.
 *
 * A Query is often spawned from a Model, but this is not necessarily
 * required- for instance it might be spawned directly from a Database.
 * A Query can also be instantiated directly using this constructor,
 * as long as the appropriate options are passed.
 *
 * Base Query options (`opts`) are passed down by the caller (as
 * mentioned previously- this is usually either a Model or Database.)
 * However additional options may be set before running the query using
 * the `.options()` modifier or `options: {}` syntax in the criteria obj.
 *
 * @constructor
 * @param {Object} opts
 */
function Query (opts) {

  // Default Query options
  opts = opts || {};
  _.defaults(opts, {
    parse: _ParseQueryResults,
    criteria: {
      where: {},
      limit: 30,
      skip: 0,
      sort: {},
      select: {},
      populate: {}
    }
  });

  // Query opts must define a `type`
  if (!opts.type) {
    throw new WLUsageError({reason: '`type` is required when defining a Query'});
  }

  // Build up our initial operations tree.
  this.operations = {};


  // Call Deferred constructor with a function that will
  // run this Query (calls .stream()) and buffers the resulting
  // records into a RecordCollection.
  //
  // (used by .exec(), .log(), and promise impl.)
  var self = this;
  Query.super_.apply(this, [opts, function runAndBufferQuery (cb) {

    self.stream().buffer(function parseBufferedRecords (err, records) {
      if (err) return cb(err);
      else return cb(null, opts.parse(records));
    });
  }]);


  /**
   * Setter which provides RAW access to Query options.
   * Called implicitly by Query modifier function (.values(), .where(), etc.),
   * and consequently does NOT run the normalization logic present in
   * those methods.
   *
   * .options(), as well as all of the query modifier methods,
   * are useful at any point in the Query lifecycle up until data
   * is flowing (i.e. `.stream()` has been called)
   *
   * @param  {Object} additionalOptions
   * @return {Query}
   */
  this.options = function (additionalOptions) {
    opts = _.merge(opts, additionalOptions);
    return this;
  };

}

util.inherits(Query, Deferred);


// Run query
Query.prototype.stream = require('./stream');


// Query modifiers
Query.prototype.populate = function () {};
Query.prototype.select = function () {};
Query.prototype.where = function () {};
Query.prototype.limit = function () {};
Query.prototype.skip = function () {};
Query.prototype.sort = function () {};
Query.prototype.paginate = function () {};
Query.prototype.values = require('./values');


/**
 * Default `parse` implementation for a Query.
 *
 * `parse` is called whenever records are to be returned
 * as an array, i.e. not a stream.
 *
 * @param  {RecordCollection} results
 * @return {RecordCollection}
 * @api private
 */
function _ParseQueryResults (results) {
  return results;
}



module.exports = Query;
