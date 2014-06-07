/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * @param  {String} identity   [usually a treepath for some criteria object]
 * @param  {Object} options
 *
 * @chainable
 */
module.exports = function malloc (identity, options) {

  if (this._buffers[identity]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot malloc "%s" - a buffer already exists with that identity!'
    ));
  }
  else {
    this._buffers[identity] = {

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

      // If the `justFootprints` flag is enabled, this buffer will retain ONLY the minimal
      // set of data which is absolutely necessary for uniquely identifying a given record,
      // i.e. primary key values, and the values of any attribute in the criteria's sort vectors.
      // For example, cursors which enable `justFootprints` in their buffer must execute one
      // additional query get the rest of the attribute values necessary for a complete result set.
      // But as you've probably already deduced, a complete result set is not always strictly necessary,
      // and so oftentimes `justFootprints` is all we need - and reduces memory-usage.
      justFootprints: options.justFootprints||undefined,

      // Will be used by `.push()` to store/manage cached records and footprints
      records: [],

      // TODO: Consider something like this:
      //        • footprints: []
      // so that a buffer can store subsets of both footprints -AND- complete records, simultaneously?
    };
  }
};



