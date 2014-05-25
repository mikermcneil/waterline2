/**
 * Module dependencies
 */

var criteriaCursor = require('../Criteria/cursor');


/**
 * #Query Engine
 *
 * The query engine traverses the given `criteriaTree` and runs
 * each one recursively using the appropriate adapter(s), datastore(s),
 * and models(s) from the given query's ORM instance.
 *
 * The query engine generates a QueryHeap.  As each recursive step completes,
 * this function iteratively stores its results in the heap.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result stream.
 *
 * @param {Object} criteriaTree
 * @param {Query} parentQuery        (note- may eventually just be `this`)
 * @param {Function} cb
 */

module.exports = function engine (criteriaTree, parentQuery, cb) {

  // Point the cursor at the top-level criteria object, which will
  // evaluate it.
  //
  // NOTE:
  // Other sub-criteria will be iterated over recursively
  // as the cursor moves into the bowels of the criteria tree with each
  // step.
  //
  criteriaCursor({
    criteria: criteriaTree,
    filter: null,
    query: parentQuery
  }, cb);
  return;
};



