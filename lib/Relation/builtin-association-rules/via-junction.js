/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var flattenClause = require('../../Query/criteria/syntax/flatten-clause');
var extractSubTree = require('../../Query/criteria/syntax/extract-subtree');
var pruneUndefined = require('root-require')('standalone/prune-undefined');


/**
 * viaJunction
 *
 * Default association rule for "collection via collection" and
 * "via-less collection" association types.
 * (aka the "hasAndBelongsToMany", or [•]<-J->N relationship)
 *
 * In this type of association:
 * • the foreign key(s) are stored in an intermediate Junction relation
 * • Each record in the junction maps a single parent record to a single
 *   child record (and potentially vice-versa, if both a "via-link" can
 *   be established.)
 * • Each parent record references between 0 and ∞ child records.
 */

module.exports = {

  // Currently, `identity` is only included for advisory purposes only
  // (i.e. it's not used elsewhere in the code base)
  identity: 'viaJunction',

  /**
   * Make any necessary changes to the parent ORM's ontology to reflect
   * the current state of this association rule.
   *
   * For our purposes in this AR, that means locating or introducing
   * new junction relations.
   */
  refresh: function () {
    var parent = this.parent;
    var orm = parent.orm;
    var attrName = this.attrName;
    var attrDef = this.attrDef;

    // assert -> !!attrDef.association.through

    // The `through` sub-object contains identifying metadata about the relation
    // which will be used to store and retrieve intermediate records for this
    // association.

    // This intermediate relation could be a Junction (private) or model (app-level)
    // relation which connects 0 or more parent records to 0 or more child records.
    this.intermediateRelation = (function _lookupInterRelation () {
      switch (attrDef.association.through.entity) {

        // If intermediate relation is a model, it must already have an identity.
        // Just look it up and expose it as `this.intermediateRelation`.
        case 'model': return orm.model(attrDef.association.through.identity);

        // If intermediate relation is a junction, we'll try to look it up, but if
        // it doesn't exist already, we'll instantiate and identify it.
        case 'junction':

          // If `through.identity` is not specified, we'll (deterministically)
          // make one up.
          attrDef.association.through.identity = attrDef.association.through.identity ||
          (function _determineIntermediateRelationIdentity() {
            if (attrDef.association.through.identity) return attrDef.association.through.identity;
            else {
              // TODO: finish this
              return 'pIdentity_pAttrname_cIdentity__cIdentity_cAttrName';
            }
          })();


          // `datastore`
          //
          // The datastore that will be used to persist metadata for this
          // association, in lieu of a foreign key existing on either side
          // of the relationship. Currently, metadata stored in this way
          // is always a physical collection which represents a logical
          // junction.
          //
          // This option looks at the `dominant` property, but a custom datastore
          // may also be directly specified as `datastore`.
          attrDef.association.through.datastore = (function _determineJunctionDatastore (){

            // Otherwise, if this AR has the `dominant` flag set, use the parent
            // relation's datastore.
            if (attrDef.association.dominant) {
              return self.datastore.identity;
            }
            // If not, use the child relation's datastore.
            else {
              return attrDef.association.identity;
            }

          })();

          var junction = orm.junction(attrDef.association.through.identity);
          if (junction) return junction;

          // If we made it here, the junction doesn't exist yet.
          // So we'll instantiate and identify it.

          var foreignKeyToParent = 'pIdentity_pAttrname_cIdentity';
          var foreignKeyToChild  = 'cIdentity_cAttrName';

          orm.junction(attrDef.association.through.identity, {

            schema: true,

            datastore: attrDef.association.datastore,

            attributes: (function _buildJunctionSchema () {
              var _attrs = {};

              // Foreign key -> to parent relation
              _attrs[foreignKeyToParent] = {
                association: {
                  entity: parent.entity,
                  identity: parent.identity,
                  plural: false
                }
              };

              // Foreign key -> to child relation
              _attrs[foreignKeyToChild] = {
                association: {
                  entity: attrDef.association.entity,
                  identity: attrDef.association.identity,
                  plural: false
                }
              };

              return _attrs;

            })()

          });

          // Then return the newly identified junction relation.
          return orm.junction(attrDef.association.through.identity);
      }
    })();




    // // Since `refresh()` is called multiple times, don't emit an error
    // // if the model does not exist (at least for now) since it may just
    // // be that it hasn't been identified yet.
    // if (!throughModel) {
    //   // TODO:
    //   // re-evaluate this-- would be nice from a developer UX perspective
    //   // to find out there's a schema issue before query-time.
    //   // (need to merge this stuff back into a branched version of `waterline-schema`)

    //   // e.g.:
    //   // orm.error('Specified `through` references a model which does not currently exist.');
    //   return;
    // }

    // Define `getJunction()` and `getFKToParent()` methods to provide
    // transparent access to the `through` model (as if it were a junction)
    // to the other AR methods defined below.
    // this.getJunction = function () {
    //   return throughModel;
    // };
    // this.getFKToParent = function () {
    //   return _.find(throughModel.attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === parent.identity &&
    //       _junctionAttrDef.association.entity === parent.entity &&
    //       _junctionAttrDef.association.via === attrName
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };
    // this.getFKToChild = function () {
    //   return _.find(throughModel.attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === _junctionAttrDef.association.identity &&
    //       _junctionAttrDef.association.entity === _junctionAttrDef.association.entity &&
    //       ( attrDef.association.via?
    //         _junctionAttrDef.association.via === attrDef.association.via : true)
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };


    // -------------------------------------------
    // ... todo: remove this stuff ...
    // --------||---------------------------------
    // --------\/---------------------------------
    var junction = orm.junction(attrDef.association.through.identity);
    if (!junction) throw 'err..';
    console.log('(=_=)/*  :: ',junction);
    // --------^^---------------------------------


    // Define `getJunction()` and `getFKToParent()` methods to provide
    // simple access to the junction within the other AR methods defined below.
    // this.getJunction = function () {
    //   return orm.junction(junctionIdent);
    // };
    // this.getFKToParent = function () {
    //   return _.find(orm.junction(junctionIdent).attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === parent.identity &&
    //       _junctionAttrDef.association.entity === parent.entity &&
    //       _junctionAttrDef.association.via === attrName
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };
    // this.getFKToChild = function () {
    //   return _.find(orm.junction(junctionIdent).attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === _junctionAttrDef.association.identity &&
    //       _junctionAttrDef.association.entity === _junctionAttrDef.association.entity &&
    //       ( attrDef.association.via?
    //         _junctionAttrDef.association.via === attrDef.association.via : true)
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };


  },



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

    var fkOnOtherRelation = this.getFKToParent();

    // Now use all that to build the transformed criteria object:
    newCriteria = originalChildCriteria;

    // Have newCriteria find child records where:
    // child[fk] =IN= parents[pk]
    // e.g.
    // {
    //   owner: [2,3,4,5,6,7,8,9]
    // }
    newCriteria.where[fkOnOtherRelation] = parentPKValues;


    // Build junction table criteria around the original child criteria
    var newCriteria = {

      from: {
        entity: this.getJunction().entity,
        identity: this.getJunction().identity
      },

      where: (function _buildJunctionWhere(){
        var __where = _.cloneDeep(originalChildCriteria.where);
        __where[fkOnOtherRelation] = parentPKValues;
        return __where;
      })(),

      select: (function _buildJunctionSelect() {

        var __select = {
          '*': true
        };

        __select[fkOnOtherRelation] = {

          from: originalChildCriteria.from,
          select: originalChildCriteria.select,
          limit: originalChildCriteria.limit,
          skip: originalChildCriteria.skip,
          sort: originalChildCriteria.sort,

          // Add in the WHERE clause from the original criteria
          // (i.e. could be the top-level WHERE or "select..where")
          // (in some cases, it may not be passed down due to the nature of a query)
          //
          // But in this case, since there's a junction in the middle, merge this
          // WHERE clause into the grandchild SELECT..WHERE:
          where: flattenClause(originalChildCriteria.where)
        };

      })()
    };

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
   * Still don't completely understand why this one has to exist..??
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Object} childCriteria
   * @param  {Object} parentCriteria
   * @return {Function}
   */
  getChildFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    // var foreignKey = this.attrName;
    // var otherRelation = this.getOtherRelation();

    // // Lookup subqueries for simpler access
    // var parentSubqueries = extractSubTree(parentCriteria, 'where');
    // var parentSubquery = parentSubqueries[this.attrName];

    var parentPK = this.parent.primaryKey;
    var childFK = this.getFKToParent();

    /**
     * @param  {Object[]} junctionBatchResults
     * @return {Object[]} subset of `junctionBatchResults`
     */
    return function _childFilter(junctionBatchResults) {

      // Find the parent results linked to these junctionBatchResults
      // (since in a hasFK association, the parent result holds the foreign key)
      var childFKValues = _.pluck(junctionBatchResults, childFK);
      var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childFKValues, parentResult[parentPK]);
      });

      // Now that we have the linked parent results from this batch, we can
      // use them to look up ALL of the possible child results:
      junctionBatchResults = _.where(junctionBatchResults, function (childRecord) {
        return _.contains(_.pluck(linkedParentResults, parentPK), childRecord[childFK]);
      });

      return junctionBatchResults;
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

    // Parent primary key
    // e.g. `id`
    var parentPK = this.parent;

    // The relevant foreign key on the child relation
    // i.e. this is the attribute on the child relation which
    // references *ME* (the current association rule on the parent relation.)
    var childForeignKey = this.getFKToParent();

    /**
     * @param  {Object[]} filteredJunctionResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredJunctionResults) {


      // Using our "via", pluck foreign key values from the child results.
      // e.g. [1,2,3,4,5,6]
      var childFKValues = _.pluck(filteredJunctionResults, childForeignKey);

      // Exclude parent batch results which are not connected to at least
      // one child result.
      var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childFKValues, parentResult[parentPK]);
      });

      // `bfPBRs` stands for "back-filtered parent batch results"
      // Formally, `bfPRs` is a subset containing those parent results
      // which link to at least one record in `filteredJunctionResults`
      return bfPBRs;
    };
  }
};
