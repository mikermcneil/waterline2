/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
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


Query.prototype.populate = function () {};
Query.prototype.select = function () {};
Query.prototype.where = function () {};
Query.prototype.limit = function () {};
Query.prototype.skip = function () {};
Query.prototype.sort = function () {};
Query.prototype.paginate = function () {};

module.exports = Query;
