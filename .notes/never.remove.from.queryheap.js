
/**
 * ----------------------------------------------------
 * We should never remove entries from the query heap.
 * Otherwise we risk deleting the data from our sibling,
 * ancestor, or descendant subqueries.
 *
 * Instead, we "new up" a QueryHeap in the top of each run
 * of the engine itself (i.e. each recursive subop gets
 * its own private QH.)  This is nice, since we can store
 * all in-memory state of any significant size in the heap.
 * Eventually, we could even allow the QH to be persisted to
 * some kind of cache adapter instead of memory, then streamed
 * out as-needed for running search/sort/map/reduce operations.
 * ----------------------------------------------------
 *
 * Removes a record from the heao.
 * @param  {String} srcIdentity
 * @param  {Array<PK>|PK} removeCriteria
 */
// QueryHeap.prototype.remove = function (srcIdentity, removeCriteria) {
//   var primaryKeyAttr = this.orm.model(srcIdentity).primaryKey;
//   return _.remove(this._models[srcIdentity], function (record) {
//     var recordId = record[primaryKeyAttr];
//     if (_.isArray(removeCriteria)) {
//       return _.any(removeCriteria, function (removeId) {
//         return removeId === recordId;
//       });
//     }
//     return removeCriteria === recordId;
//   });
// };
