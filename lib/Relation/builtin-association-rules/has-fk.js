/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var flattenClause = require('../../Query/criteria/syntax/flatten-clause');
var extractSubTree = require('../../Query/criteria/syntax/extract-subtree');
var pruneUndefined = require('root-require')('standalone/prune-undefined');


/**
 * has-fk
 *
 * Default association rule for `model` associations
 * (aka the "hasOne" or "-->1" relationship)
 */

module.exports = {

  /**
   * Identify any junctions introduced by this association rule in
   * the parent ontology (i.e. `orm`).
   */

  refresh: function() {
    console.log('refreshing association rule: `%s.%s`', this.parent.identity, this.attrName);
  },



  /**
   * In this type of association (i.e. "hasOne"), the foreign key is
   * either the primary key value of a child record, or null/undefined.
   * Each parent record references precisely 0 or 1 child records.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {

    // Use the original (though normalized) child criteria as our starting point
    var newCriteria = originalChildCriteria;

    // The attribute name is used as our foreign key
    //
    // Note: a `fieldName` (aka columnName) may be specified
    // in the attribute definition for this association and it
    // will be used again.  This mapping is handled transparently
    // in Adapter.bridge().
    var foreignKey = this.attrName;
    var otherRelation = this.getOtherRelation();

    // Pluck the foreign key values from the parent batch results
    // then strip records where a foreign key is undefined
    // (since we can safely ignore them)
    var childRecordPKValues;
    childRecordPKValues = _.pluck(parentBatchResults, foreignKey);
    childRecordPKValues = pruneUndefined(childRecordPKValues);

    // Look for child records where their primary key is === to the
    // relevant foreign key value from one of the parent records in this batch.
    newCriteria.where[otherRelation.primaryKey] = childRecordPKValues;

    // Merge in the "select..where" clause from the original criteria
    newCriteria.where = _.merge(newCriteria.where, flattenClause(originalChildCriteria.where));

    return newCriteria;
  },


  /**
   * getChildFilter()
   *
   * Return a function which will be used to filter each batch of child results
   * returned from the raw page queries within the recursive step.
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Object} childCriteria
   * @param  {Object} parentCriteria
   * @return {Function}
   */
  getChildFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    var foreignKey = this.attrName;
    var otherRelation = this.getOtherRelation();

    // Lookup subqueries for simpler access
    var parentSubqueries = extractSubTree(parentCriteria, 'where');
    var parentSubquery = parentSubqueries[this.attrName];

    /**
     * @param  {Object[]} childBatchResults
     * @return {Object[]} subset of `childBatchResults`
     */
    return function _childFilter(childBatchResults) {

      // Eliminate unnecessary childBatchResults:
      var childBatchResultsWhose;
      if (parentSubquery && parentSubquery.whose) {
        childBatchResultsWhose = WLTransform(childBatchResults, {where: parentSubquery.whose}).results;
      }
      else childBatchResultsWhose = childBatchResults;

      // Find the parent results linked to these childBatchResults
      // (since in a 1-->N, the parent result holds the foreign key)
      var childPKValues = _.pluck(childBatchResultsWhose, otherRelation.primaryKey);
      var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childPKValues, parentResult[foreignKey]);
      });

      // Now that we have the linked parent results from this batch, we can
      // use them to look up ALL of the possible child results:
      childBatchResults = _.where(childBatchResults, function (subResult) {
        return _.contains(_.pluck(linkedParentResults, foreignKey), subResult[otherRelation.primaryKey]);
      });

      // TODO: (optimization)
      // On the other hand, if the query does NOT have a nested select on
      // this attribute, we only need to keep the child records found as
      // part of the parentSubquery (`subResultWhose`) instead of the entire set
      // of all associated child records (`childBatchResults`)

      // TODO: actually do something
      // (btw this function is equivalent to the memfilter in the current criteria cursor impl)
      return childBatchResults;
    };
  },


  /**
   * Return a function which will be used to filter each batch of parent results
   * using child results returned from the recursive step.  This allows us to
   * use a subquery, while still including the full set of child results
   * e.g. find people who have a dog named "fred" (and populate ALL of their dogs)
   *
   * This filter can also be referred to as a "back-filter", since it changes the
   * parent result set based on the results from the child cursor (i.e. recursive
   * step.)
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Array} childCriteria
   * @param  {Object} parentCriteria
   */
  getParentFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    var foreignKey = this.attrName;
    var otherRelation = this.getOtherRelation();

    /**
     * @param  {Object[]} filteredChildResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredChildResults) {
      var childPKs = _.pluck(filteredChildResults, otherRelation.primaryKey);

      // `bfPBRs` stands for "back-filtered parent batch results"
      var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childPKs, parentResult[foreignKey]);
      });

      // Return the subset of parent results which link
      // to a record in `filteredChildResults`
      return bfPBRs;
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
   * for all relations has finished.
   */
  migrate: function() {

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
   *
   */
  replace: function(newSetOfRecords) {
    throw new Error('Not implemented yet');
  },

  /**
   * Called when Waterline wants to add new record(s) to this association.
   * Note that the record must already exist (have been `.create()`'ed) within
   * a relation.  If the record already belongs to this association, this method
   * should leave it alone.
   *
   * TODO: figure this out: should it return a set of operations...?
   *
   */
  add: function(recordsToAdd) {
    throw new Error('Not implemented yet');
  },

  /**
   * Called when Waterline wants to remove record(s) from this association.
   * Note that the record will not be destroyed- it will just no longer show
   * up as a member of this association.
   *
   * TODO: figure this out: should it return a set of operations...?
   *
   */
  remove: function(recordsToRemove) {
    throw new Error('Not implemented yet');
  }
};
