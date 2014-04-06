/**
 * Module dependencies
 */

var util = require('util');
var Deferred = require('../Deferred');



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
}

util.inherits(Query, Deferred);

module.exports = Query;
