/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var flattenClause = require('../../Query/criteria/syntax/flatten-clause');
var extractSubTree = require('../../Query/criteria/syntax/extract-subtree');
var pruneUndefined = require('root-require')('standalone/prune-undefined');


/**
 * hasFK
 *
 * Default association rule for `model` associations
 * (aka the "hasOne" or "•-->1" relationship)
 */

module.exports = {

  // For logging purposes only
  id: 'hasFK',


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

    // Merge in the WHERE clause from the original criteria
    // (i.e. could be the top-level WHERE or "select..where")
    // (in some cases, it may not be passed down due to the nature of a query)
    newCriteria.where = _.merge(newCriteria.where, flattenClause(originalChildCriteria.where));

    return newCriteria;
  },


  /**
   * getChildFilter()
   *
   * Return a function which will be used to filter each batch of child results
   * returned from the raw page queries within the recursive step.
   *
   * The purpose of this filter is mainly to exclude child records which are
   * NOT associated with this batch of parent results.
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

      ///////////////////////////////////////////////////////////////////////////
      // Actually we can't safely do this all the time.
      //
      // We can't safely remove these records if the parent criteria has a WHOSE
      // subquery that it uses for qualifying its own records, but actually still
      // populates all of the child results (even those which would fail the WHOSE
      // subquery filter.)
      //
      // <optimization>
      // Do this in for queries where it is possible to reduce the total # of
      // raw `.find()`s
      // </optimization>
      //
      // TODO: pull this code out into the criteria cursor so it doesn't have to
      // exist in every AR.
      //
      ///////////////////////////////////////////////////////////////////////////
      // Eliminate `childBatchResults` records who fail a match against
      // the WHOSE subquery clause from the previous recursive step:
      // var childBatchResultsWhose;
      // if (parentSubquery && parentSubquery.whose) {
      //   childBatchResultsWhose = WLTransform(childBatchResults, {where: parentSubquery.whose}).results;
      // }
      // else childBatchResultsWhose = childBatchResults;
      ///////////////////////////////////////////////////////////////////////////

      // Find the parent results linked to these childBatchResults
      // (since in a hasFK association, the parent result holds the foreign key)
      var childPKValues = _.pluck(childBatchResults, otherRelation.primaryKey);
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
  }

};
