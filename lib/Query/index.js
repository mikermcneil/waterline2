/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred');
var runQuery = require('./run');
var parseQueryResults = require('./parse');



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
    parse: parseQueryResults,
    criteria: {
      where: {},
      limit: 30,
      skip: 0,
      sort: {},
      select: {},
      populate: {}
    }
  });

  // Build up our initial operations tree.
  this.operations = {};

  // Modify the context of our private `runQuery` function
  // so that it has access to `this`- the Query object - mainly
  // so it can get access to the `operations`.
  runQuery = _.bind(runQuery, this);

  // Call Deferred constructor, using the fn that
  // will execute this Query.
  Query.super_.apply(this, [opts, runQuery]);
}

util.inherits(Query, Deferred);

// Set runtime query options
Query.prototype.options = function (opts) {
  this.options = _.merge(this.options, opts);
};

// Query modifiers
Query.prototype.populate = function () {};
Query.prototype.select = function () {};
Query.prototype.where = function () {};
Query.prototype.limit = function () {};
Query.prototype.skip = function () {};
Query.prototype.sort = function () {};
Query.prototype.paginate = function () {};


/**
 * An operation modifier that allows users to specify
 * `values` or an array of `values` objects for use in
 * a `create` or `update` query.
 *
 * Normalizes usage to a RecordStream (a ReadableStream).
 *
 * @param {Object[]|Object|RecordStream} values
 */

Query.prototype.values = function (values) {

  var ins;

  if ( !_.isObject(values) ) {
    throw new WLUsageError({ reason: 'Invalid usage of .values() modifier' });
  }
  else if (_.isArray(values)) {
    // TODO: new up a RecordStream on the fly, emit all Records in order
    ins = new RecordStream();
  }
  else if (values instanceof RecordStream) {
    // If `values` is already a RecordStream, we're good.
    ins = values;
  }
  else if (values instanceof RecordCollection) {
    // TODO: new up a RecordStream on the fly, emit all Records in order
    ins = new RecordStream();
  }
  else if (values instanceof Record) {
    // TODO: new up a RecordStream on the fly, emit the Record
    ins = new RecordStream();
  }
  else {
    // TODO: new up a RecordStream on the fly, emit the Record
    ins = new RecordStream();
  }

  this.ins = ins;
};


module.exports = Query;
