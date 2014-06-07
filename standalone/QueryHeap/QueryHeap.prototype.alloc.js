/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * @param  {String} bufferCtx   [usually a treepath for some criteria object]
 * @param  {Object} options
 *
 * @chainable
 */
module.exports = function alloc (bufferCtx, options) {

  if (this._buffers[bufferCtx]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot alloc "%s" - a buffer already exists with that identity!'
    ));
  }
  else {
    this._buffers[bufferCtx] = {
      sort: undefined,
      skip: undefined,
      limit: undefined,
      footprint: undefined,
      records: []
    };
  }
};



