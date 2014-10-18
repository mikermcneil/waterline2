/**
 * Module dependencies
 */

var util = require('util');
var Record = require('../Record');



/**
 * Construct a RecordCollection.
 *
 * A RecordCollection is somewhere between a cache and a datastore transaction.
 *
 * It is both:
 * 1. a finite array representation of an ordered set of Records
 * 2. a cursor representing a slice of a much larger dataset.
 *
 * This "slice" is connected to a particular Query, and may or may not be
 * insulated within a transaction, at any one of the varying levels of
 * atomicity, consistency, durability, and isolation guarantees offered
 * by Waterline and its adapters.
 *
 *
 * Synchronous methods: (track changes in-memory)
 *  • foo.remove()
 *  • foo.add()
 *  • foo.resetChanges()
 *
 * Write methods: (asynchronous)
 *  • foo.save()
 *  • foo.destroy()
 *
 * Read methods: (asynchronous, for convenience)
 *  • foo.findNext()
 *  • foo.findPrevious()
 *  • foo.sort()
 *  • foo.contains()
 *  • etc.
 *
 *
 * All methods above are referentially transparent at the datastore level
 * (i.e. no lasting side-effects) EXCEPT FOR `.save()` and `.destroy()`:
 *
 * `.destroy()`
 * Removes all records in the RecordCollection from the datastore.
 *
 * `.save()`
 * Updates or creates records in the underlying datastore.
 * Keep in mind that `.save()` persists ALL changes that have been made
 * to the RecordCollection-- e.g. if you change a property on a record in
 * the first page of results, then call nextPage() a few times to get more,
 * AND THEN call `.save()`, the changes to the original page will be persisted.
 *
 *
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

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

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
