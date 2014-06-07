/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');


/**
 * @param  {String} bufferCtx   [usually a treepath for some criteria object]
 * @return {Array}
 */
module.exports = function get (bufferCtx) {

  // Lookup the buffer
  var buffer = this._buffers[bufferCtx];

  // If no buffer exists for the specified context, return an empty array
  if (!buffer) return [];

  // If a buffer DOES exist, return its contents
  else {

    // TODO: Come back and consider adding a `_.cloneDeep()` here
    // On one hand it's a good idea to protect the contents of
    // this buffer from inadvertant modification in userland, but
    // at the same time it adds a completely unnecessary performance
    // hit.  Could always have a configuration option I guess...
    return buffer.records;
  }
};
