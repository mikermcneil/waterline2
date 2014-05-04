/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../../../util/prettyInstance');




/**
 * Construct a QueryCache.
 *
 * QueryCache instances are used for storing and emitting results
 * from the query engine (i.e. operation runner).  If streaming,
 * when the data necessary to form a complete Record is ready, it
 * is immediately emitted for integration, instantiation, and output.
 * Otherwise, if the output spans multiple databases AND must be sorted,
 * the QueryCache waits until an entire result set is ready, then emits it
 * to the integrator, which instantiates a RecordCollection and returns
 * it to the user via a promise/callback.
 *
 * (TODO:)
 * In the latter case, it is the responsibility of the QueryCache to
 * warn about the possibility of reaching excessive memory usage for a
 * single query before reaching a critical crash scenario.  For now,
 * this is enforced as a basic max limit on sorted result sets that
 * span multiple databases.
 *
 * @constructor
 * @extends {EventEmitter}
 */

function QueryCache (opts) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  _.merge(this, opts || {});

  this._models = {};
}
util.inherits(QueryCache, EventEmitter);

QueryCache.prototype.wipe = function (modelIdentity) {
  this._models[modelIdentity] = [];
  return this;
};

QueryCache.prototype.push = function (modelIdentity, results) {
  this.emit('batch', modelIdentity, results);
  this._models[modelIdentity] = (this._models[modelIdentity] || []).concat(results);
  return this;
};

QueryCache.prototype.get = function (modelIdentity) {
  return this._models[modelIdentity] || [];
};


/**
 * ----------------------------------------------------
 * We should never remove entries from the query cache.
 * Otherwise we risk deleting the data from our sibling,
 * ancestor, or descendant subqueries.
 *
 * Instead, we "new up" a QueryCache in the top of each run
 * of the engine itself (i.e. each recursive subop gets
 * its own private QC.)  This is nice, since we can store
 * all in-memory state of any significant size in the cache.
 * Eventually, we could even allow the QC to be persisted to
 * some kind of cache adapter instead of memory, then streamed
 * out as-needed for running search/sort/map/reduce operations.
 * ----------------------------------------------------
 *
 * Removes a record from the cache.
 * @param  {String} modelIdentity
 * @param  {Array<PK>|PK} removeCriteria
 */
// QueryCache.prototype.remove = function (modelIdentity, removeCriteria) {
//   var primaryKeyAttr = this.orm.model(modelIdentity).primaryKey;
//   return _.remove(this._models[modelIdentity], function (record) {
//     var recordId = record[primaryKeyAttr];
//     if (_.isArray(removeCriteria)) {
//       return _.any(removeCriteria, function (removeId) {
//         return removeId === recordId;
//       });
//     }
//     return removeCriteria === recordId;
//   });
// };


// Presentation (util.inspect() in Node)
QueryCache.prototype.inspect = function () {
  return prettyInstance(this, this._models);
};

module.exports = QueryCache;
