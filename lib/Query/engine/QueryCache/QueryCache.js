/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var WLTransformer = require('waterline-criteria');
_.defaults = require('merge-defaults');
var WLUsageError = require('../../../WLError/WLUsageError');
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
  // Make `this._models` non-enumerable
  Object.defineProperty(this, '_models', { enumerable: false, writable: true });

  _.merge(this, opts || {});

  this._models = {};

  if (!this.orm) {
    throw new WLUsageError('An `orm` is required when initializing a QueryCache');
  }

  // Enforced by QC:
  // this.sort;
  // this.limit;

  // Ignored in QC for now:
  // this.where;
  // this.select;
  // this.skip;

}
util.inherits(QueryCache, EventEmitter);

QueryCache.prototype.wipe = function (modelIdentity) {
  this._models[modelIdentity] = [];
  return this;
};

QueryCache.prototype.push = function (modelIdentity, newResults) {

  var orm = this.orm;
  var sort = this.sort;
  var skip = this.skip;
  var limit = this.limit;
  var footprint = this.footprint;

  // Ensure an array exists for this model
  this._models[modelIdentity] = (this._models[modelIdentity] || []);

  var _models = this._models;


  var model = this.orm.model(modelIdentity);
  var primaryKey = model.primaryKey;

  // Identify newResults which are unique
  var uniqueNewRecords = _.where(newResults, function ifUnique(newResult) {
    var criteria = {}; criteria[primaryKey] = newResult[primaryKey];
    var extantMatchingResult = _.findWhere(_models[modelIdentity], criteria);
    // If a result with the same primary key already exists, merge new with old.
    if (extantMatchingResult) {
      _.extend(extantMatchingResult, newResult);
      return false;
    }
    else return true;
  });


  var footprints;

  // Only project new records into footprints if `footprint` is set
  if (!footprint) {
    // Otherwise just push everything and return early
    _models[modelIdentity].push.apply(_models[modelIdentity],uniqueNewRecords);
  }

  else {

    footprints = _.map(uniqueNewRecords, function pushIfUnique (newResult) {
      // Strip down a version of `newResult` that consists of only
      // its primary key and sort vector values.
      var sortAttributes = _.keys(sort);
      var footprint = _.pick(newResult, function (val,attrName) {
        return attrName === primaryKey ||
               _.contains(sortAttributes, attrName);
      });
      return footprint;

    });

    // If > skip+limit footprints have been stored, only push the
    // new footprints which are better matches than any of the
    // currently-cached records.
    // console.log('--------');
    // console.log('from:',modelIdentity);
    // console.log('skip:',skip);
    // console.log('limit:',limit);
    // console.log('sort:',sort);
    _models[modelIdentity].push.apply(_models[modelIdentity],footprints);
  }

  // Sort and limit
  _models[modelIdentity] = WLTransformer.sort(_models[modelIdentity], sort);
  _models[modelIdentity] = _.first(_models[modelIdentity], skip+limit);


  ////////////////////////////////////////////////////////////
  // reconsider this approach:
  // (we really can't emit a batch until all the associations
  //  necessary to properly populate this record have been fetched.)
  // Also, currently, this doesn't take into account merged-in
  // changes from same-pk records that replaced earlier versions.
  // It also doesn't take into account limit or skip or sort.
  //
  this.emit('batch', modelIdentity, footprints || uniqueNewRecords);
  ////////////////////////////////////////////////////////////

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
