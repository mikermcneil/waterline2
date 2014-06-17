/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var flattenClause = require('../../Query/criteria/syntax/flatten-clause');
var extractSubTree = require('../../Query/criteria/syntax/extract-subtree');
var pruneUndefined = require('root-require')('standalone/prune-undefined');
var WLError = require('root-require')('standalone/WLError');





/**
 * viaJunctor
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

  // TODO: name this AR `viaJunctor` for consistency
  // (b/c it is not necessarily dealing w/ Junctions [i.e. private models], rather
  // it contains logic for dealing with ANY relation which is being USED as a junctor,
  // i.e. it could be referring to models or junctions for any of the 3 involved relations.)

  /**
   * Build a function which, given a hypothetical child record,
   * return the records in `parentBatchResults` that would be
   * considered its "parents".
   *
   * @param  {Array} parentBatchResults
   * @param  {Query} query
   * @param  {String} qpath
   * @return {Function}
   */

  buildGetRelatedFn: function (parentBatchResults, query, qpath) {

    var orm = this.parent.orm;
    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();
    var attrDef = this.attrDef;
    var attrName = this.attrName;
    var viaAttrName = this.attrDef.association.through.via;

    /**
     * Given a hypothetical future child record, return the records from
     * the current set that would be considered its "parent".
     * @param  {Object} futureChildRecord
     * @return {Array}
     */
    return function _getRelated (futureChildRecord) {
      console.log(
        'Running `getRelated()` using the `viaJunctor` AR for '+attrName+' within qpath: '+qpath+
        '\nLooking for child record:',
        futureChildRecord,
        '\n & the parent batch results are: ',
        parentBatchResults,
        '\n & the primary key:',
        parentRelation.primaryKey,
        '\n & the viaAttrName:',
        viaAttrName,
        '\n & the through `onto`:',attrDef.association.through.onto
      );

      // TODO: expand this to work w/ junctions (not just models)
      var adjoiningRelation = orm.model(attrDef.association.through.identity);
      var adjoiningBufferIdentity = qpath+'.'+
      attrName+'['+futureChildRecord[childRelation.primaryKey]+'].'+
      '&'+adjoiningRelation.entity+'_'+adjoiningRelation.identity+'_'+attrDef.association.through.onto;
      console.log('adjoiningBufferIdentity:',adjoiningBufferIdentity);
      var adjoiningBuffer = query.heap.get(adjoiningBufferIdentity);


      return _.where(parentBatchResults, function (parentRecord) {
        return _.any(adjoiningBuffer,function (joinRecord) {
          return joinRecord[attrDef.association.through.via] === parentRecord[parentRelation.primaryKey] &&
            joinRecord[attrDef.association.through.onto] === futureChildRecord[childRelation.primaryKey];
        });
      });
    };
  },


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

    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();

    // assert -> attrDef.association.through

    // The `through` sub-object contains identifying metadata about the relation
    // which will be used to store and retrieve intermediate records for this
    // association.

    // This `adjoiningRelation` could be a Junction (private) or model (app-level)
    // relation which connects 0 or more parent records to 0 or more child records.
    this.adjoiningRelation = (function _lookupInterRelation () {
      switch (attrDef.association.through.entity) {

        // If `adjoiningRelation` is a model, it must already have an identity.
        // Just look it up and expose it as `this.adjoiningRelation`.
        case 'model':

          // TODO:
          // if things like `dominant` or `database` were specified,
          // we should emit a warning informing the architect that they're
          // not going to work, since the settings of the model itself will take
          // precendence.
          // console.log('in viaJunction AR for "%s.%s", looking for adjoining relation "%s" in models',parent.identity, attrName, attrDef.association.through.identity);
          // console.log('parent:',parent);
          // console.log('orm',orm);
          // console.log('all models:',orm.models);


          var throughModel = orm.model(attrDef.association.through.identity);

          // While we're here, also go ahead and add an explicit virtual attribute
          // to the other side of this many-to-many association
          // (this is crucial for accurate querying)
          var virtualThroughAttrName = '&'+throughModel.entity+'_'+throughModel.identity+'_'+attrDef.association.through.onto;
          childRelation.attributes[virtualThroughAttrName] = {
            association: {
              entity: throughModel.entity,
              identity: throughModel.identity,
              plural: true,
              via: attrDef.association.through.onto
            }
          };
          return throughModel;

        // If `adjoiningRelation` is a junction, we'll try to look it up, but if
        // it doesn't exist already, we'll instantiate and identify it.
        case 'junction':

          // Prevent unintentional consequences of using anonymous junctions
          // in WL1 (compatibilityMode)
          if (orm.compatibilityMode) {
            return;
            // throw new WLError('Private junctions not allowed in compatibility mode.');
          }

          // If `through.identity` is not specified, we'll (deterministically)
          // make one up.
          attrDef.association.through.identity = attrDef.association.through.identity ||
          (function _determineadjoiningRelationIdentity() {
            return 'pIdentity_pAttrname_cIdentity__cIdentity_cAttrName';
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
          attrDef.association.through.datastore = attrDef.association.through.datastore||
          (function _determineJunctionDatastore (){

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


          // So now we'll (re)instantiate the junction.
          // This could be optimized to use the old one if it exists, but
          // since we'd need to merge in any options which might have changed,
          // it's not really all that different from just recreating it
          // (and in fact it might be slower)
          orm.junction(attrDef.association.through.identity, {

            schema: true,

            datastore: attrDef.association.through.datastore,

            attributes: (function _buildJunctionSchema () {
              var _attrs = {};

              var foreignKeyToParent = 'pIdentity_pAttrname_cIdentity';
              var foreignKeyToChild  = 'cIdentity_cAttrName';

              // Foreign key -> to parent relation
              _attrs[foreignKeyToParent] = {
                association: {
                  entity: parentRelation.entity,
                  identity: parentRelation.identity,
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

    // If an adjoining relation could not be determined just give up.
    // A reasonable error will be shown at query time.
    // (this is important for WL1 compatibility w/i the `operation-shim`)
    if (!this.adjoiningRelation){
      return;
    }

  },



  /**
   * Get child criteria.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {

    // Ensure that this function does not mutate the originalChildCriteria
    originalChildCriteria = _.cloneDeep(originalChildCriteria);
    // console.log('---- old criteria -----','\n',require('util').inspect(originalChildCriteria, false, null),'\n------- / -------\n');

    var attrName = this.attrName;
    var attrDef = this.attrDef;
    var parentRelation = this.parent;
    var adjoiningRelation = this.adjoiningRelation;
    var childRelation = this.getOtherRelation();
    var fkToParentOnJunctor = this.attrDef.association.through.via;
    var fkToChildOnJunctor = this.attrDef.association.through.onto;
    var assocToParentOnChild = this.attrDef.association.via;
    // (function (){
    //   // TODO: clean this up
    //   var orm.model();
    //   this.attrDef.association.through.onto;
    // })();
    // console.log('fkToParentOnJunctor',fkToParentOnJunctor);
    // console.log('fkToChildOnJunctor',fkToChildOnJunctor);

    console.log('childRelation:',childRelation.identity);
    console.log('adjoiningRelation:',adjoiningRelation.identity);
    console.log('parentRelation:',parentRelation.identity);

    // Build up a set of pk values from parent batch results
    // to use in the criteria below.
    //
    // e.g. [2,3,4,5,6,7,8,9]
    var parentPKValues = _.pluck(parentBatchResults, this.parent.primaryKey);
    parentPKValues = pruneUndefined(parentPKValues);

    // Build a virtual attribute which references the appropriate
    // junctor directly from the child.
    var assocToJunctor =
      '&'+adjoiningRelation.entity+'_'+
      adjoiningRelation.identity+'_'+
      fkToChildOnJunctor;

    // TODO:
    // Try out the new approach of querying the child (i.e. destination) relation
    // directly and building a subquery to the junctor in the WHERE clause in
    // the child select
    // (e.g. find drivers, and for each one select taxis where t.e. permits whose
    // "_driver" is in the batch of pk values from this driver batch.  Then, the
    // pk values each taxi batch will be added **LATER** to the WHERE clause as a
    // feature of the association rule between taxis and permits. If no such association
    // exists [i.e. this is one way and there is no taxi.drivers or taxi.permits], we'll
    // use a virtual attribute, e.g. &through|driver|taxis|0 which will have the appropriate
    // AR, from, select, and where assigned at runtime.  We could really just always use
    // the latter approach- and in fact it would make the code cleaner)

    // Now use all that to build the transformed criteria object:
    var newCriteria;

    // Build junction table criteria around the original child criteria
    newCriteria = {

      from: {
        entity: childRelation.entity,
        identity: childRelation.identity
      },

      limit: originalChildCriteria.limit,
      skip: originalChildCriteria.skip,
      sort: originalChildCriteria.sort,

      // Intermediate wrapper criteria must inherit limit/skip/sort
      // from the child criteria...?
      // limit: originalChildCriteria.limit,
      // skip: originalChildCriteria.skip,
      // sort: originalChildCriteria.sort,

      // Build WHERE clause so that junction records
      // are filtered using a subquery (in the antagonistic case,
      // is implemented by yet another paging cursor(s), but
      // ideally, this allows the relevant database to execute
      // a single native query if both the junctor relation and
      // the child relation live in the same datastore)
      where: (function _buildWhere() {
        var _where = {};

        // Merge in original child criteria where (many-to-many populate..where)
        _.merge(_where,originalChildCriteria.where);

        _where[assocToJunctor] = {
          min: 1,
          whose: {}
        };
        _where[assocToJunctor].whose[fkToParentOnJunctor] = parentPKValues;

        return _where;
      })(),

      select: (function _buildJunctorSelect() {

        var __select = {
          '*': true
        };


        // TODO: merge original select in, but make sure the crucial parts
        // so far (i.e. the '*':true) don't get smashed.  If *:false is in
        // original select, calculate the inverted projection so it's compatible
        // with `'*':true` and merge that in
        // __selectoriginalChildCriteria.select,


        // Build grandchild select clause
        __select[assocToJunctor] = {

          from: {
            entity: adjoiningRelation.entity,
            identity: adjoiningRelation.identity
          },

          where: (function _buildWhere() {
            var _where = {};
            _where[fkToParentOnJunctor] = parentPKValues;

            return _where;
          })()

          // ----- ------

          //-- update june5 --
          // Actually I think we want the AR within the junctor to figure
          // this grandchild where clause out for us..
          // where: {}
          // --- ----

          //   // The where criteria for the final (grand?)child relation
          // where: (function _buildJunctionWhere(){

          //   // TODO: this needs work- should merge in the populate..where criteria
          //   // but not the criteria w/ the fks from the junction step

          //   var __where = originalChildCriteria.where;
          //   __where[attrDef.association.via] = parentPKValues;
          //   return __where;
          // })(),
        };
        return __select;

      })()
    };

    console.log('-------------------\nvia-junctor '+this.attrName+':',util.inspect(newCriteria, false, null), '\n------- / -------\n');

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
  getChildFilter: function(filteredParentBatchResults /*unused:::, childCriteria, parentCriteria */) {

    // var foreignKey = this.attrName;
    // var otherRelation = this.getOtherRelation();

    // // Lookup subqueries for simpler access
    // var parentSubqueries = extractSubTree(parentCriteria, 'where');
    // var parentSubquery = parentSubqueries[this.attrName];

    var parentPK = this.parent.primaryKey;
    var childFK = this.attrDef.association.through.via;


    // Actually these child results are now from the child, not the junctor
    return function (childBatchResults){
      return childBatchResults;
    };

    /**
     * @param  {Object[]} junctionBatchResults
     * @return {Object[]} subset of `junctionBatchResults`
     */
    // return function _childFilter(junctionBatchResults) {

    //   // Find the parent results linked to these junctionBatchResults
    //   // (since in a hasFK association, the parent result holds the foreign key)
    //   var childFKValues = _.pluck(junctionBatchResults, childFK);
    //   var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
    //     return _.contains(childFKValues, parentResult[parentPK]);
    //   });

    //   // Now that we have the linked parent results from this batch, we can
    //   // use them to look up ALL of the possible child results:
    //   junctionBatchResults = _.where(junctionBatchResults, function (childRecord) {
    //     return _.contains(_.pluck(linkedParentResults, parentPK), childRecord[childFK]);
    //   });

    //   return junctionBatchResults;
    // };
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
  getParentFilter: function(filteredParentBatchResults /*unused::, childCriteria, parentCriteria */) {

    // Parent primary key
    // e.g. `id`
    var parentPK = this.parent;

    // The relevant foreign key on the child relation
    // i.e. this is the attribute on the child relation which
    // references *ME* (the current association rule on the parent relation.)
    var childForeignKey = this.attrDef.association.through.via();

    /**
     * @param  {Object[]} filteredJunctionResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredChildResults) {

      return filteredParentBatchResults;
      // // Using our "via", pluck foreign key values from the child results.
      // // e.g. [1,2,3,4,5,6]
      // var childFKValues = _.pluck(filteredJunctionResults, childForeignKey);

      // // Exclude parent batch results which are not connected to at least
      // // one child result.
      // var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
      //   return _.contains(childFKValues, parentResult[parentPK]);
      // });

      // // `bfPBRs` stands for "back-filtered parent batch results"
      // // Formally, `bfPRs` is a subset containing those parent results
      // // which link to at least one record in `filteredJunctionResults`
      // return bfPBRs;
    };
  }
};
