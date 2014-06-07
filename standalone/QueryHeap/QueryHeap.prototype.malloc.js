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
module.exports = function malloc (bufferCtx, options) {

  if (this._buffers[bufferCtx]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot malloc "%s" - a buffer already exists with that identity!'
    ));
  }
  else {
    this._buffers[bufferCtx] = {

      // These `sort`, `skip`, and `limit` modifiers will be applied locally within the
      // context of this particular buffer, filtering records iteratively as they're
      // `.push()`ed into the heap as the relevant cursor pages through batches of records.
      // Putting this filtering/sorting in QueryHeap allows us to contain the complexity
      // of this memory management and further simplify the core criteria cursor logic.
      sort: options.sort||undefined,
      skip: options.skip||undefined,
      limit: options.limit||undefined,

      // NOTE:
      // If the `justFootprints` flag is enabled, this buffer will retain ONLY the minimal
      // set of data which is absolutely necessary for uniquely identifying a given record,
      // i.e. primary key values, and the values of any attribute in the criteria's sort vectors.
      // For example, cursors which enable `justFootprints` in their buffer must execute one
      // additional query get the rest of the attribute values necessary for a complete result set.
      // But as you've probably already deduced, a complete result set is not always strictly necessary,
      // and so oftentimes `justFootprints` is all we need - and reduces memory-usage.
      justFootprints: options.justFootprints||undefined,

      // Will be used by `.push()` to store cached records or footprints
      records: [],

      // TODO: consider splitting off footprints into its own thing?
      footprints: []
    };
  }
};



