/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');



/**
 * Construct an AssociationRule.
 *
 * @param {Object} definition
 *                    -> relation: {Relation}
 *                    -> attrName: {String}
 *                    -> ...
 * @constructor
 */

function AssociationRule (definition) {

  // Make `this.parent` non-enumerable
  Object.defineProperty(this, 'parent', { enumerable: false, writable: true });

  // Merge properties into the Relation instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);

  // Remember original `attrDef`
  this.attrDef = this.parent.attributes[this.attrName]||{};

  // Mix in default association rule definition
  _.defaults(this, {

    /**
     * Identify any junctions introduced by this association rule in
     * the parent ontology (i.e. `orm`).
     */

    refresh: function () {

      console.log('refreshing using DEFAULT NOOP association rule: `%s.%s`', this.parent.identity,this.attrName);

      // // hack for development only:
      // if (this.attrName === 'recipients') {
      //   var junctionIdentity = 'chatperson';
      //   this.parent.orm.junction(junctionIdentity, {

      //     // By default, store the junction in the relation's datastore
      //     datastore: this.parent.datastore
      //   });
      //   console.log('identifying junction:', junctionIdentity, this.parent.orm.junction(junctionIdentity).datastore);
      // }
    },



    /**
     * Build a child criteria tree to use in the recursive step.
     *
     * For example, assuming `attrName === "chatHistory"`, and given
     * the subtree (`originalChildCriteria`):
     *
     * ```
     * {
     *   from: 'chat',
     *   select: {
     *     message: true
     *   },
     *   where: {
     *     flaggedAsOffensive: true
     *   }
     * }
     * ```
     *
     * getCriteria() would return a modified/"wrapped" subcriteria
     * which is context-dependent, e.g.:
     *
     * ```
     * {
     *   junction: 'chat_user',
     *   select: {
     *     chat: {
     *       from: 'chat',
     *       select: {
     *         message: true
     *       },
     *       where: {
     *         flaggedAsOffensive: true
     *       }
     *     }
     *   },
     *   where: {
     *     user: [1,2,3,4,5,8,9,32,1045,93223,16,30]
     *   }
     * }
     * ```
     *
     * Warning:
     * This is a hot code path.  It is called by the query
     * engine every time it runs a query. Should avoid
     * deep-cloning if possible.
     *
     * @param  {Object[]} parentBatchResults
     * @param  {Criteria} originalChildCriteria
     * @return {Criteria}
     *
     * @nosideeffects
     */
    getCriteria: function (parentBatchResults, originalChildCriteria) {
      throw new Error('getCriteria() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule yet');
      // NOTE: parentBatchResults were NOT filtered using
      //
      // TODO: actually build the child criteria
      // return {
      //   junction: 'chatperson'
      // };
    },


    /**
     * Build an in-memory filter function to run on each batch
     * of cursor results retrieved in the NEXT RECURSIVE STEP.
     * (e.g. where the transformed criteria tree built by `getCriteria()`
     * is being used)
     *
     * For example, if I wanted to find chats sent by a user named "Dan",
     * I would use the following criteria:
     * ```
     * {
     *   from: 'chat',
     *   where: {
     *     user: {
     *       whose: { name: 'Dan' }
     *     }
     *   }
     * }
     * ```
     * So after fetching a batch of chats, the query engine will take the
     * recursive step and starts fetching batches of user candidates (who might
     * be named Dan),  to "interview" them, if you will.  But before doing that,
     * it runs `getWhoseFilter()` to get a function that will be called on each
     * batch of users.  In this case, the returned function would return only
     * users that are named "Dan".  This makes the recursive child cursor aware
     * of which users match the parent subquery (its `filteredBatchResults`).
     * When the child cursor finishes with each of ITS nested selects (i.e. joins),
     * it will compare its `filteredBatchResults` against the subset of results
     * it received from ITS recursive call for that association.  It is in this
     * way that we can perform subqueries of infinite depth (e.g. chat's from a user
     * named Dan whose mom's name is Kathy whose brother's name is Dominick).
     * Finally, the results from that second filtering replace the original
     * `parentBatchResults`, and are eventually pushed into a private queryheap
     * for the child cursor when all associations are finished.  That
     * private queryheap grows with each batch of child results, and then finally
     * the engine is finished searching through:
     * <<<users named Dan associated with the current batch of chats>>>
     * The private queryheap is then pushed into the top-level queryheap so that
     * it will be available to the integrator.
     *
     *
     * @param  {Object[]} filteredParentBatchResults
     * @param  {Criteria} originalChildCriteria
     * @return {Function}
     *
     * @nosideeffects
     * @hotcodepath
     */
    getChildFilter: function (filteredParentBatchResults, originalChildCriteria) {
      throw new Error('getChildFilter() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule yet');
      /**
       * @param  {Object[]} childResults
       * @return {Object[]} subset of `childResults`
       */
      return function _childFilter (childResults){
        // TODO: actually do something
        // (btw this function is equivalent to the memfilter in the current criteria cursor impl)
        return childResults;
      };
    },


    /**
     * This is the "second filtering" mentioned above.
     * (i.e. in the parent cursor, the logic that compares the parent's
     * `filteredBatchResults` against the child cursor results received
     * for a particular association
     *
     * Should return a subset of `filteredParentResults`
     *
     * TODO: call this function in the criteria cursor
     *
     * @nosideeffects
     * @hotcodepath
     */
    getParentFilter: function (filteredParentBatchResults, originalChildCriteria, originalQuery) {
      throw new Error('getParentFilter() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule yet');
      /**
       * @param  {Object[]} childResults
       * @return {Object[]} a subset of `filteredParentBatchResults`
       */
      return function _parentFilter (childResults) {
        // TODO: actually do something
        return filteredParentBatchResults;
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
     *
     */
    replace: function (newSetOfRecords) {
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
    add: function (recordsToAdd) {
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
    remove: function (recordsToRemove) {
      throw new Error('Not implemented yet');
    }
  });

}


/**
 * `this.getOtherRelation()`
 *
 * @return {Relation}
 */
AssociationRule.prototype.getOtherRelation = function () {
  switch (this.attrDef.association.entity) {
    case 'model':
      return this.parent.orm.model(this.attrDef.association.identity);
    case 'junction':
      return this.parent.orm.junction(this.attrDef.association.identity);
  }
};



module.exports = AssociationRule;
