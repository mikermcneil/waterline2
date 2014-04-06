/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred');
var executeQuery = require('./exec');



/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on one or more Databases.
 *
 * A Query is often spawned from a Model, but this is not necessarily
 * required (for now, we'll assume it is.)
 *
 * @constructor
 * @param {Object} opts
 */
function Query (opts) {
  opts = opts || {};

  // Build up our initial operations tree.
  this.operations = {};

  // Modify the context of our private `executeQuery` function
  // so that it has access to `this`- the Query object - mainly
  // so it can get access to the `operations`.
  executeQuery = _.bind(executeQuery, this);

  // Call Deferred constructor, using the fn that
  // will execute this Query.
  Query.super_.apply(this, [opts, executeQuery]);
}

util.inherits(Query, Deferred);

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
 * @param {Object[]|Object|RecordStream} ins
 */

Query.prototype.values = function (ins) {
  if (_.isArray(ins)) {
    // TODO: new up a RecordStream on the fly, emit each Record
  }
  else if (_.isObject(ins)) {
    if (ins instanceof Stream.ReadableStream) {
      // ok we're good (but we should make sure its an actual RecordStream too)
    }
    else if (ins instanceof RecordCollection) {
      // TODO: new up a RecordStream on the fly, emit each Record
    }
    else if (ins instanceof Record) {
      // TODO: new up a RecordStream on the fly, emit the Record
    }
    else {
      // TODO: new up a RecordStream on the fly, emit the Record
    }
  }
  else throw new WLUsageError({ reason: 'Invalid usage of .values() modifier' });
};


module.exports = Query;
