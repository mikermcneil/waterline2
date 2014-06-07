/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
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
  // Make `this._models` non-enumerable
  Object.defineProperty(this, '_models', { enumerable: false, writable: true });
  // Make `this._junctions` non-enumerable
  Object.defineProperty(this, '_junctions', { enumerable: false, writable: true });

  _.merge(this, opts || {});

  this._models = {};
  this._junctions = {};

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


/**
 * [wipe description]
 * @param  {[type]} src [description]
 * @return {[type]}     [description]
 */
QueryHeap.prototype.wipe = function (src) {

  ///////////////////////////////////////////////////////
  // Normalize `src`:
  //
  // `src` may be specified as a string (identity of a model)
  // or an object (Model or Junction instance)
  var srcIdentity;
  var _heapdb;
  if (_.isString(src)) {
    srcIdentity = src;
    _heapdb = this._models;
  }
  else {
    if(src.constructor.name === 'Model') {
      _heapdb = this._models;
    }
    else {
      _heapdb = this._junctions;
    }
    srcIdentity = src.identity;
  }
  ///////////////////////////////////////////////////////

  _heapdb[srcIdentity] = [];
  return this;
};



/**
 * [push description]
 * @param  {[type]} src
 * @param  {[type]} newRecords [description]
 * @return {[type]}            [description]
 */
QueryHeap.prototype.push = function (src, newRecords) {

  ///////////////////////////////////////////////////////
  // Normalize `src`:
  //
  // `src` may be specified as a string (identity of a model)
  // or an object (Model or Junction instance)
  var srcIdentity;
  var _heapdb;
  if (!src) throw new WLUsageError('`src` must be specified when pushing to a QueryHeap');
  else if (_.isString(src)) {
    srcIdentity = src;
    _heapdb = this._models;
  }
  else {
    if(src.constructor.name === 'Model') {
      _heapdb = this._models;
    }
    else {
      _heapdb = this._junctions;
    }
    srcIdentity = src.identity;
  }
  ///////////////////////////////////////////////////////





  var orm = this.orm;
  var sort = this.sort;
  var skip = this.skip;
  var limit = this.limit;
  var footprint = this.footprint;

  // Ensure an array exists for this model
  _heapdb[srcIdentity] = (_heapdb[srcIdentity] || []);

  var primaryKey = src.primaryKey;

  // Identify newRecords which are unique
  var uniqueNewRecords = _.where(newRecords, function ifUnique(newRecord) {
    var criteria = {}; criteria[primaryKey] = newRecord[primaryKey];
    var extantMatchingResult = _.findWhere(_heapdb[srcIdentity], criteria);
    // If a result with the same primary key already exists, merge new with old.
    if (extantMatchingResult) {
      _.extend(extantMatchingResult, newRecord);
      return false;
    }
    else return true;
  });


  var footprints;

  // Only project new records into footprints if `footprint` is set
  if (!footprint) {
    // Otherwise just push everything and return early
    _heapdb[srcIdentity].push.apply(_heapdb[srcIdentity],uniqueNewRecords);
    // Sort and limit
    _heapdb[srcIdentity] = WLTransform.sort(_heapdb[srcIdentity], sort);
    _heapdb[srcIdentity] = _.first(_heapdb[srcIdentity], limit);
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
    // console.log('from:',srcIdentity);
    // console.log('skip:',skip);
    // console.log('limit:',limit);
    // console.log('sort:',sort);
    _heapdb[srcIdentity].push.apply(_heapdb[srcIdentity],footprints);
    // Sort and limit
    _heapdb[srcIdentity] = WLTransform.sort(_heapdb[srcIdentity], sort);
    _heapdb[srcIdentity] = _.first(_heapdb[srcIdentity], skip+limit);
  }



  ////////////////////////////////////////////////////////////
  // TODO: reconsider this approach:
  // (we really can't emit a batch until all the associations
  //  necessary to properly populate this record have been fetched.)
  // Also, currently, this doesn't take into account merged-in
  // changes from same-pk records that replaced earlier versions.
  // It also doesn't take into account limit or skip or sort.
  //
  this.emit('batch', srcIdentity, footprints || uniqueNewRecords);
  ////////////////////////////////////////////////////////////

  return this;

};



/**
 * [get description]
 * @param  {[type]} src [description]
 * @return {[type]}     [description]
 */
QueryHeap.prototype.get = function (src) {

  ///////////////////////////////////////////////////////
  // Normalize `src`:
  //
  // `src` may be specified as a string (identity of a model)
  // or an object (Model or Junction instance)
  var srcIdentity;
  var _heapdb;
  if (_.isString(src)) {
    srcIdentity = src;
    _heapdb = this._models;
  }
  else {
    if(src.constructor.name === 'Model') {
      _heapdb = this._models;
    }
    else {
      _heapdb = this._junctions;
    }
    srcIdentity = src.identity;
  }
  ///////////////////////////////////////////////////////

  return _heapdb[srcIdentity] || [];
};


// Presentation
QueryHeap.prototype.inspect = function () {
  return prettyInstance(this, {
    models: this._models,
    junctions: this._junctions
  });
};

module.exports = QueryHeap;
