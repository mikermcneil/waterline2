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
 * @extends {Deferred}
 *
 * @param {Object} opts
 */
function Query (opts, worker) {

  // Default Query options
  opts = opts || {};
  _.defaults(opts, {
    parse: _ParseQueryResults,
    operations: {
      where: {},
      limit: 30,
      skip: 0,
      sort: {},
      select: {},
      populate: {}
    }
  });
  this._opts = opts;

  // An ORM instance must be passed in as `opts.orm`,
  // or set later as `this._orm`
  this._orm = opts.orm;

  // Build up our initial operations tree.
  this.operations = opts.operations;

  // Advisory flag about whether this Query is being truly streamed
  // or not (streaming USAGE works either way.)
  this.streamable = true;


  // Call Deferred constructor with a function that will
  // run this Query (calls .stream()) and buffers the resulting
  // records into a RecordCollection.
  //
  // (used by .exec(), .log(), and promise impl.)
  var self = this;
  Query.super_.apply(this, [opts, function do_exec (cb) {

    var whenWorkerFinished = function (err, results) {
        // console.log('finished adapter worker', arguments);
        // TODO: intercept or something and run parse at that time
        // self.stream().buffer(function parseBufferedRecords (err, records) {
        //   if (err) return cb(err);
        //   else return cb(null, opts.parse(records));
        // });
        cb(err, results);
    };

    // Don't use the query runner/engine + integrator
    // if `raw` is turned on:
    if (self._opts.raw) {
      if (!worker) return cb(null, []);
      else return worker(whenWorkerFinished);
    }
    else {
      return self.run(function (err) {
        if (err) return whenWorkerFinished(err);

        // TODO: figure out how to get the modelIdentity

        // No WL2.0 integrator yet, so for now
        // we stub our results using data from
        // the cache:

        // var results = self._cache.get('foo');
        return whenWorkerFinished(err, self._cache);
      });
    }
  }]);



}

util.inherits(Query, Deferred);


/**
 * Wrapper function for query runner.
 * @return {Query}
 */
Query.prototype.run = require('./runner');


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
Query.prototype.options = function (additionalOptions) {
  this._opts = _.merge(this._opts, additionalOptions);
  return this;
};


// old
/////////
// Run query
// Query.prototype.stream = require('./stream');
// </old>


// Query modifiers
Query.prototype.populate = function () {};
Query.prototype.select = function () {};
Query.prototype.where = function () {};
Query.prototype.limit = function () {};
Query.prototype.skip = function () {};
Query.prototype.sort = function () {};
Query.prototype.paginate = function () {};
Query.prototype.values = require('./values');


// Presentation:
Query.prototype.inspect = function () {
  return util.inspect(this._opts.operations, false, null);
};


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
