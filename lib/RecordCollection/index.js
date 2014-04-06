/**
 * Module dependencies
 */




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

RecordCollection.prototype.add = function () {};
RecordCollection.prototype.remove = function () {};

// TODO: extend from Array

module.exports = Record;
