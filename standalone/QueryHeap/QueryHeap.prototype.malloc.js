/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * @param  {String} bufferIdentity   [usually a treepath for some criteria object]
 * @param  {Object} options
 *
 * @chainable
 */
module.exports = function malloc (bufferIdentity, options) {

  if (this._buffers[bufferIdentity]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot malloc "%s" - a buffer already exists with that identity',
      bufferIdentity
    ));
  }
  else {
    this._buffers[bufferIdentity] = {

      // `from` is necessary so that the QueryHeap can introspect the schema
      // of the relations whose records are stored in this buffer.
      from: options.from||undefined,

      // These `sort`, `skip`, and `limit` modifiers will be applied locally within the
      // context of this particular buffer, filtering records iteratively as they're
      // `.push()`ed into the heap as the relevant cursor pages through batches of records.
      // Putting this filtering/sorting in QueryHeap allows us to contain the complexity
      // of this memory management and further simplify the core criteria cursor logic.
      sort: options.sort||undefined,
      skip: options.skip||undefined,
      limit: options.limit||undefined,

      // Will be used by `.push()` to store/manage cached records and footprints
      records: [],

      // TODO: Consider something like this:
      //        • footprints: []
      // so that a buffer can store subsets of both footprints -AND- complete records, simultaneously?
    };
  }
};



