/**
 * Module dependencies
 */

var util = require('util');
var Deferred = require('../Deferred');
var executeQuery = require('./exec');



/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on a Database.  A Query
 * is often spawned from a model, but this is not necessarily
 * required.
 *
 * @constructor
 * @param {Object} opts
 */
function Query (opts) {
  opts = opts || {};

  // Call Deferred constructor, using the fn that
  // will execute this Query.
  Query.super_.apply(this, [opts, executeQuery]);
}

util.inherits(Query, Deferred);

module.exports = Query;
