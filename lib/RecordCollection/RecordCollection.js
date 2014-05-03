/**
 * Module dependencies
 */

var util = require('util');
var Record = require('../Record');



/**
 * Construct a RecordCollection.
 *
 * Finite array representation of an ordered set of Records.
 *
 * -----------------------------------------------------------------
 * Notice about `sort`
 *
 * A RecordCollection WILL ALWAYS BE IN THE EXPECTED ORDER if a `sort`
 * was specified to the source Query, even if the underlying adapter(s)
 * don't support the feature at the data layer.  This is thanks to the
 * query integrator, which can `sort` anything as long as it can fit
 * it in memory.
 * -----------------------------------------------------------------
 *
 * @constructor
 * @param {Record[]} records
 */
function RecordCollection (records) {

  // `records` is an array of Record instances
}

// Extend from Array
util.inherits(RecordCollection, Array);


/**
 * @sync
 */
RecordCollection.prototype.add = function () {
  // TODO
};

/**
 * @sync
 */
RecordCollection.prototype.remove = function () {
  // TODO
};


/**
 * @async
 */
RecordCollection.prototype.contains = function (cb) {
  // TODO
  cb();
};

/**
 * @async
 */
RecordCollection.prototype.save = function (cb) {
  // TODO
  cb();
};





/**
 * Override output for use w/ `util.inspect()`
 * @return {String}
 */
RecordCollection.prototype.inspect = function () {
  // TODO
  return this.toString();
};


module.exports = Record;
