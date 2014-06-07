/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var prettyInstance = require('root-require')('standalone/pretty-instance');


/**
 * Construct a QueryHeap.
 *
 * QueryHeap instances are used for storing and emitting results
 * from the query engine (i.e. criteria cursor).  If streaming,
 * when the data necessary to form a complete Record is ready, it
 * is immediately emitted for integration, instantiation, and output.
 * Otherwise, if the output spans multiple datastores AND must be sorted,
 * the QueryHeap waits until an entire result set is ready, then emits it
 * to the integrator, which instantiates a RecordCollection and returns
 * it to the user via a promise/callback.
 *
 * (TODO:)
 * In the latter case, it is the responsibility of the QueryHeap to
 * warn about the possibility of reaching excessive memory usage for a
 * single query before reaching a critical crash scenario.  For now,
 * this is enforced as a basic max limit on sorted result sets that
 * span multiple datastores.
 *
 * > Note:
 * >
 * > In some ways, you can think about a QueryHeap a bit like a SQL view,
 * > or "relvar".  It tracks order, but still must be integrated before
 * > it can be used directly in the normal, expected way (as an ordered
 * > result set of objects, potentially with populated data in each one)
 *
 * @constructor
 * @extends {EventEmitter}
 */

function QueryHeap (opts) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  // Build initial set of buffers.
  this._buffers = {};

  // Merge all opts into `this` context.
  _.merge(this, opts || {});

  if (!this.orm) {
    throw new WLUsageError('An `orm` is required when initializing a QueryHeap');
  }

  // Enforced by QH:
  // this.sort;
  // this.limit;

  // Ignored in QH for now:
  // this.where;
  // this.select;
  // this.skip;

}
util.inherits(QueryHeap, EventEmitter);


// Integrator
QueryHeap.prototype.integrate = require('./integrate');

// Execute a query to convert footprints into complete records
// (NOTE: this doesn't currently work--in reality it's implemented differently. But this is here as a reminder.)
QueryHeap.prototype.rehydrate = require('./rehydrate');

// Saves new records to an existing page buffer
QueryHeap.prototype.push = require('./QueryHeap.prototype.push');

// Gets all records from the specified page buffer
QueryHeap.prototype.get = require('./QueryHeap.prototype.get');

// Allocates a new page buffer with the specified properties
QueryHeap.prototype.malloc = require('./QueryHeap.prototype.malloc');

// Presentation
QueryHeap.prototype.inspect = function () {
  return prettyInstance(this, {
    _buffers: this._buffers
  });
};

module.exports = QueryHeap;
