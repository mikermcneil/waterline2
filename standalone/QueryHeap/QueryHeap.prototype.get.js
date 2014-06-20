/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');


/**
 * @param  {String} bufferIdentity   [usually a treepath for some criteria object]
 * @return {Array}
 */
module.exports = function get (bufferIdentity) {
  if (!bufferIdentity) {
    throw new WLUsageError(util.format(
      'In QueryHeap.prototype.get(), 1st argument `bufferIdentity` is required - Usage:  `someheap.get(bufferIdentity)`'
    ));
  }

  //
  // TODO:
  // implement skip (and possibly even `where`) here
  // (instead of doing it manually when a cursor is almost finished)
  //


  // Lookup the buffer
  var buffer = this._buffers[bufferIdentity];

  // If the indicated buffer does not exist, fail gracefully
  // by returning an empty array.
  if (!buffer) return [];

  // If a buffer DOES exist, return its contents
  else {

    // TODO: Come back and consider adding a `_.cloneDeep()` here
    // On one hand it's a good idea to protect the contents of
    // this buffer from inadvertant modification in userland, but
    // at the same time it adds a completely unnecessary performance
    // hit.  Could always have a configuration option I guess...
    var slicedRecords = buffer.records;

    //////////////////////////////////////////////////////////////////////////////////////////
    // Not sure if this is the right place to do this stuff, but trying it out
    //////////////////////////////////////////////////////////////////////////////////////////
    slicedRecords = WLTransform.sort(slicedRecords, buffer.sort || {});
    // TODO:
    // allow for >1000000 records in result set- instead of doing the following,
    // if no limit is set, just clip off the first SKIP records
    //
    slicedRecords = slicedRecords.slice((buffer.skip || 0), (buffer.limit || 1000000) + (buffer.skip || 0));
    //////////////////////////////////////////////////////////////////////////////////////////

    return slicedRecords;
  }
};
