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

      // Waterline's built-in association types:
      // (logical-layer)
      // ============================================================
      //
      // • (A) model
      // • (B) collection
      // • (C) model..via..model
      // • (D) collection..via..model
      // • (E) model..via..collection
      // • (F) collection..via..collection


      // Waterline's built-in association persistence strategies:
      // (physical-layer)
      // ============================================================
      //
      // •  1.fk <---> 1.fk   -    (C)    - Both sides "hasOne" using their own foreign key &† must be manually synced. [one-to-one]                                           (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)
      //
      // •   N <---  1.fk     -  (A|D|E)  - One side "hasOne" using a foreign key and the other side "hasMany" through backreference &† automatically in-sync. [one-to-many]
      //
      // •     N <-J-> M      -   (B|F)   - Both sides "hasMany" through backreference to a Junction w/ two foreign keys &† automatically in-sync  [many-to-many]
      //
      // •   N[fk]  ---> M    -    (B)    - One side "hasMany" using an array of FKs &† automatically in-sync. [many-to-many]
      //
      // •  N[fk]  ---> M.fk  - (A|D|E|B) - One side "hasMany" using an array of FKs and the other "hasOne" using a foreign key &† must be manually synced. [one-to-many]      (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)
      //
      // • N[fk] <---> M[fk]  -    (F)    - Both sides "hasMany" using arrays of FKs &† must be manually synced. [many-to-many]                                                (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)



      // Note on association rules and logical meaning vs. physical persistence:
      //
      // The physical representation of some logical association types is
      // identical to others.  However the association rules are slightly
      // different since, just because the physical representation is the
      // same doesn't mean you can query them the same way.  That is all
      // dependent on which side you start from.  Also the logical association
      // type impacts whether both sides are automatically kept in sync (i.e. `via`),
      // and whether removed records are deleted or soft-deleted (i.e. `cascade`).


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
    replace: function (newSetOfRecords) {
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
    remove: function (parentResults, recordsToRemove) {
      throw new Error('Not implemented yet');
    },


  };

  return rule;
};

