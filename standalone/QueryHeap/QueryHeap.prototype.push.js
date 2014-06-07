/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * Push `newRecords` to the specified `bufferCtx`.
 *
 * @param  {String} bufferCtx   [usually a treepath for some criteria object]
 * @param  {Array} newRecords
 *
 * @chainable
 */
module.exports = function push (bufferCtx, newRecords) {



};




  // ///////////////////////////////////////////////////////
  // // Normalize `src`:
  // //
  // // `src` may be specified as a string (identity of a model)
  // // or an object (Model or Junction instance)
  // var srcIdentity;
  // var _heapdb;
  // if (!src) throw new WLUsageError('`src` must be specified when pushing to a QueryHeap');
  // else if (_.isString(src)) {
  //   srcIdentity = src;
  //   _heapdb = this._models;
  // }
  // else {
  //   if(src.constructor.name === 'Model') {
  //     _heapdb = this._models;
  //   }
  //   else {
  //     _heapdb = this._junctions;
  //   }
  //   srcIdentity = src.identity;
  // }
  // ///////////////////////////////////////////////////////





  // // var orm = this.orm;
  // // var sort = this.sort;
  // // var skip = this.skip;
  // // var limit = this.limit;
  // // var footprint = this.footprint;

  // // // Ensure an array exists for this model
  // // _heapdb[srcIdentity] = (_heapdb[srcIdentity] || []);

  // // var primaryKey = src.primaryKey;

  // // // Identify newRecords which are unique
  // // var uniqueNewRecords = _.where(newRecords, function ifUnique(newRecord) {
  // //   var criteria = {}; criteria[primaryKey] = newRecord[primaryKey];
  // //   var extantMatchingResult = _.findWhere(_heapdb[srcIdentity], criteria);
  // //   // If a result with the same primary key already exists, merge new with old.
  // //   if (extantMatchingResult) {
  // //     _.extend(extantMatchingResult, newRecord);
  // //     return false;
  // //   }
  // //   else return true;
  // // });


  // // var footprints;

  // // // Only project new records into footprints if `footprint` is set
  // // if (!footprint) {
  // //   // Otherwise just push everything and return early
  // //   _heapdb[srcIdentity].push.apply(_heapdb[srcIdentity],uniqueNewRecords);
  // //   // Sort and limit
  // //   _heapdb[srcIdentity] = WLTransform.sort(_heapdb[srcIdentity], sort);
  // //   _heapdb[srcIdentity] = _.first(_heapdb[srcIdentity], limit);
  // // }

  // // else {

  // //   footprints = _.map(uniqueNewRecords, function pushIfUnique (newResult) {
  // //     // Strip down a version of `newResult` that consists of only
  // //     // its primary key and sort vector values.
  // //     var sortAttributes = _.keys(sort);
  // //     var footprint = _.pick(newResult, function (val,attrName) {
  // //       return attrName === primaryKey ||
  // //              _.contains(sortAttributes, attrName);
  // //     });
  // //     return footprint;

  // //   });

  // //   // If > skip+limit footprints have been stored, only push the
  // //   // new footprints which are better matches than any of the
  // //   // currently-cached records.
  // //   // console.log('--------');
  // //   // console.log('from:',srcIdentity);
  // //   // console.log('skip:',skip);
  // //   // console.log('limit:',limit);
  // //   // console.log('sort:',sort);
  // //   _heapdb[srcIdentity].push.apply(_heapdb[srcIdentity],footprints);
  // //   // Sort and limit
  // //   _heapdb[srcIdentity] = WLTransform.sort(_heapdb[srcIdentity], sort);
  // //   _heapdb[srcIdentity] = _.first(_heapdb[srcIdentity], skip+limit);
  // // }



  // // ////////////////////////////////////////////////////////////
  // // // TODO: reconsider this approach:
  // // // (we really can't emit a batch until all the associations
  // // //  necessary to properly populate this record have been fetched.)
  // // // Also, currently, this doesn't take into account merged-in
  // // // changes from same-pk records that replaced earlier versions.
  // // // It also doesn't take into account limit or skip or sort.
  // // //
  // // this.emit('batch', srcIdentity, footprints || uniqueNewRecords);
  // // ////////////////////////////////////////////////////////////

  // // return this;
