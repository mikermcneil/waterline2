/**
 * #Model.prototype.getAssociationRule()
 *
 * TODO: refactor: make this neater- maybe define an `AssociationRule` class?
 *
 * @this {Model}
 * @param  {String} attrName
 * @return {AssociationRule}
 * @api private
 */

module.exports = function getAssociationRule (attrName) {

  var model = this;
  var attrDef = this.attributes[attrName];

  var rule = {

    /**
     * Build a child criteria object.
     *
     * Warning:
     * This is a hot code path.  It is called by the query
     * engine every time it runs a query.
     *
     * @param  {Object[]} parentResults
     * @param  {Criteria} originalChildCriteria
     * @param  {Query}    originalQuery
     * @return {Criteria}
     */
    getChildCriteria: function (parentResults, originalChildCriteria, originalQuery) {

      // TODO: actually build the child criteria
      return {};
    },


    /**
     * Build an in-memory filter that should be run on each
     * batch of child results returned from the child criteria.
     *
     * Warning:
     * This is a hot code path.  It is called by the query
     * engine every time it runs a query.
     *
     * @param  {Object[]} parentResults
     * @param  {Criteria} originalChildCriteria
     * @param  {Query}    originalQuery
     * @return {Function}
     */
    getChildFilter: function (parentResults, originalChildCriteria, originalQuery) {

      // TODO: actually build the child filter
      return function _memfilter (subResults){
        return subResults;
      };
    },

    /**
     * Execute DDL to modify the underlying physical collection(s)
     * as-needed to make this association rule work.
     *
     * IMPORTANT:
     * This must be an idempotent operation, as it should be possible
     * for `migrate()` to be called repeatedly, even at runtime.  The
     * `migrate()` for association rules is called *AFTER* the `migrate()`
     * for all models has finished.
     */
    migrate: function () {

      // TODO: actually migrate the association
      throw new Error('Not implemented yet');
    },


    /**
     * Called when Waterline wants to completely replace/set/override/wipe
     * the contents of this association and replace them with a new set of
     * records.
     *
     * TODO: figure this out: should it return a set of operations...?
     */
    set: function (newSetOfRecords) {
      throw new Error('Not implemented yet');
    },

    /**
     * Called when Waterline wants to add new record(s) to this association.
     * Note that the record must already exist (have been `.create()`'ed) within
     * a model.  If the record already belongs to this association, this method
     * should leave it alone.
     *
     * TODO: figure this out: should it return a set of operations...?
     */
    add: function (recordsToAdd) {
      throw new Error('Not implemented yet');
    },

    /**
     * Called when Waterline wants to remove record(s) from this association.
     * Note that the record will not be destroyed- it will just no longer show
     * up as a member of this association.
     *
     * TODO: figure this out: should it return a set of operations...?
     */
    remove: function (recordsToRemove) {
      throw new Error('Not implemented yet');
    },


  };

  return rule;
};





////////////////////////////////////
// For reference:                 //
////////////////////////////////////

// // Noop rule:
// var rule = {

//   getChildCriteria: function (parentResults) {
//     return {};
//   },

//   getChildFilter: function (parentResults) {
//     return function _memfilter (subResults){
//       return subResults;
//     };
//   }
// };
