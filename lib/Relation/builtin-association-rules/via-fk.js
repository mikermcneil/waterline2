/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var flattenClause = require('../../Query/criteria/syntax/flatten-clause');
var extractSubTree = require('../../Query/criteria/syntax/extract-subtree');
var pruneUndefined = require('root-require')('standalone/prune-undefined');


/**
 * viaFK
 *
 * Default association rule for "collection via model" associations
 * (aka the "belongsToMany" or "•<--N" relationship)
 *
 * In this type of association (i.e. "belongsToMany"), the foreign key(s) are
 * stored on the child record(s) (it is also very possible that none exist for
 * a given parent record.) Each parent record references between 0 and ∞ child records.
 *
 */

module.exports = {

  // For logging purposes only
  id: 'viaFK',

  /**
   * Get child criteria.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {


    // Build up a set of pk values from parent batch results
    // to use as the criteria for the child query.
    //
    // e.g. [2,3,4,5,6,7,8,9]
    var parentPKValues = _.pluck(parentBatchResults, this.parent.primaryKey);
    parentPKValues = pruneUndefined(parentPKValues);

    // The attribute on the other relation that this association
    // references with its `via` property is used as our foreign key.
    //
    // Note: a `fieldName` (aka columnName) may be specified
    // in the attribute definition on the other relation, and it will
    // be used without us doing anything further.  This is thanks to
    // transparent mapping in Adapter.bridge().
    //
    // e.g. "owner"
    var foreignKeyOnOtherRelation = this.attrDef.association.via;

    // Now use all that to build the transformed criteria object:
    var newCriteria = originalChildCriteria;

    // Have newCriteria find child records where:
    // child[fk] =IN= parents[pk]
    // e.g.
    // {
    //   owner: [2,3,4,5,6,7,8,9]
    // }
    newCriteria.where[foreignKeyOnOtherRelation] = parentPKValues;

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

      // ...

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

      // ...
      // TODO
      var bfPBRs = [];

      // var childPKs = _.pluck(filteredChildResults, otherRelation.primaryKey);

      // // `bfPBRs` stands for "back-filtered parent batch results"
      // var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
      //   return _.contains(childPKs, parentResult[foreignKey]);
      // });

      // Return the subset of parent results which link
      // to a record in `filteredChildResults`
      return bfPBRs;
    };
  }
};
