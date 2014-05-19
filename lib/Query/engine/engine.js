/**
 * Module dependencies
 */

var runOperation = require('./runOperation');


/**
 * #Query Engine
 *
 * The query engine traverses the given `operationsTree` and runs
 * each one recursively using the appropriate adapter(s), database(s),
 * and models(s) from the given query's ORM instance.
 *
 * The query engine generates a QueryHeap.  As operations complete,
 * this function iteratively stores its results in the heap.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result stream.
 *
 * @param {Object} operationsTree
 * @param {Query} parentQuery        (note- may eventually just be `this`)
 * @param {Function} cb
 */

module.exports = function engine (operationsTree, parentQuery, cb) {

  // Run the top-level operation
  // (other sub-operations will be run recursively)
  runOperation({
    operations: operationsTree,
    filter: null,
    query: parentQuery
  }, cb);
  return;
};



