/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var WLTransform = require('waterline-criteria');

var extractSubTree = require('./syntax/extract-subtree');
var flattenClause = require('./syntax/flatten-clause');
var criteriaUnion = require('./syntax/criteria-union'); // TODO: use this for `where..whose` vs. `select..where` optimizations
var lookupRelationFrom = require('./lookup-relation-from');

var WLError = require('root-require')('standalone/WLError');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var pruneUndefined = require('root-require')('standalone/prune-undefined');
var QueryHeap = require('root-require')('standalone/QueryHeap');



/**
 * cursor()
 *
 * This module executes a Query's plan.
 * While optimizations in the plan are implemented where possible, a worst-case-scenario
 * shim is implemented by paging through underlying records using raw queries, taking
 * advantage of a number of additional on-the-fly optimizations.
 *
 * Recursive, asynchronous function evaluates a criteria tree, then descends
 * into nested criteria trees (SELECT/projections/joins) and subqueries (WHERE/filter/`whose`).
 *
 * @this {Query}
 *
 * @param {Object} opts
 *
 *                 opts.criteria   - A criteria tree object, set by the caller.
 *                                   It does not necessarily represent a branch of the ancestral criteria tree
 *                                   passed to the original Query and may therefore be manipulated by the caller
 *                                   for her own purposes.  This feature is useful for transforming associations
 *                                   in the query criteria syntax into lower-level predicates that can be safely
 *                                   evaluated by the other logic in the cursor.
 *
 *                 opts.query      - reference to the parent Query instance that spawned this cursor.
 *                                   (this is how we get access to the orm's ontology and convenience methods)
 *
 *                 opts.filter     - in-memory filter function that should be called with the initial batch of
 *                                   raw query results to transform them.  This could do anything-- it's up to
 *                                   the caller to build this function and return something meaningful.
 *                                   (this is useful for evaluating recursive subqueries.)
 *
 *                 Performance tuning opts: (optional)
 *                 =====================================
 *                 batchSize                 - # of records to return per batch when paging
 *                 minNumIntermediateResults - buffer filtered page results until this minimum # of records is reached before continuing with the recursive step (processing joins, etc.)
 *
 *
 * @param {Function} cb
 */

function criteriaCursor (options, cb) {

  // Parse options
  var criteria = options.criteria;
  var query = options.query;
  var filterFn = options.filter;
  var depth = options.depth||0;


  console.log('\n');
  if (depth===0) {
    console.log('********************************************');
    console.log('NEW QUERY');
    console.log('********************************************');
    console.log('\n');
  }
  else {
    console.log('--- --- --- recursive step --- --- ---');
  }
  console.log('Spawned cursor @ level %d', depth);
  console.log('criteria:',util.inspect(criteria,false,null));

  // Grab hold of the query's ORM, heap, and constructor
  // (these are the same for each recursive step)
  var orm = query.orm;
  var heap = query.heap;

  // Flags indicating whether optimizations are enabled or not
  var ENABLED_OPTIMIZATIONS = {
    accumulatePageResults: true
  };


  var BATCH_SIZE = options.batchSize||100;
  var MIN_NUM_INTERMEDIATE_RESULTS = options.minNumIntermediateResults||100;


  // Locate `src` relation (model or junction)
  var src = lookupRelationFrom(criteria.from, orm);
  if (!src) {
    return cb(new WLError(util.format('"%s" does not exist in the ontology (should be a known model or junction)',criteria.from)));
  }

  // Compute a flattened version of the WHERE clause
  // This eliminates nested WHEREs (aka subqueries)
  var flatWhere = flattenClause(criteria.where);

  // Lookup subqueries for simpler access
  var subqueries = extractSubTree(criteria, 'where');

  // Next, it's time to take care of joins.
  var joins = extractSubTree(criteria, 'select');


  // Build SELECT clause for the raw query
  //
  // TODO: Build SELECT clause to get only the footprints
  // (use only the primary key + any relevant foreign keys)
  // (relevant meaning there exists subselects that depend on them for `via` of a N.1 or N.M association)
  var select = {};
  // Always select the parent's primary key
  select[src.primaryKey] = true;
  // For now, grab everything!!!
  select['*'] = true;
  // _.each(src.attributes, function (def,attrName){
  //   select[attrName] = true;
  // });

  // Build WHERE clause for the raw query
  var where = _.cloneDeep(flatWhere);

  // <optimization>
  // In some cases, we CAN apply the original WHERE clause to our paging queries.
  // However, to do that, we must have certainty that no relevant (i.e. cousins)
  // WHOSE subquery clauses exist with an incompatible (i.e. disjoint) `whose`/`min`/`max`
  // tuple. So for now, we do not apply it at all.
  //
  // And consequently, we have to filter it out in-memory later.  Either way, this
  // strategy is an inevitability for certain scenarios- it's just that we can use
  // this optimization to make sure it only happens when it absolutely has to.
  // </optimization>

  var pageNo;
  var batchResults;
  var filteredBatchResults = [];

  // In addition to the top-level public query heap, each cursor
  // within a query needs its own local heap. The purpose of `localHeap`
  // is to store/sort/rank pages of in-memory-filtered parent records
  // (i.e. `filteredBatchResults`) accumulated over the course of paging/batching
  // through the entire parent result set.
  // Eventually, all records in the localHeap will be pushed to the top-level
  // query heap for further processing and, eventually, will be output to the
  // original caller of the query method.
  // var localHeapDef = {
  //   orm: orm,
  //   skip: criteria.skip,
  //   limit: criteria.limit,
  //   sort: criteria.sort || {},
  //   footprint: true
  // };
  var localHeapDef = {
    orm: orm,
    skip: criteria.skip || 0,
    limit: criteria.limit || 30,
    sort: criteria.sort || {},
    footprint: true
  };
  var localHeap = new QueryHeap(localHeapDef);

  console.log(
    '\n',
    '¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢\n',
    'Top-level criteria tree for the current cursor: ',criteria,
    '\n',
    'Created local query heap for "'+criteria.from.identity+'" ::', localHeapDef,
    '\n¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢'
  );

  // <optimization>
  // OPTIMIZE:
  // use an optimized (O(C)) approach if possible to skip the paging step.
  // this could be taken care of in the query optimizer beforehand, modifying
  // the query plan to make it more explicit.
  // Even then, the plan would need to be inspected at this point to determine
  // whether to page or not to page.
  //</optimization>

  // Page through records:
  async.doUntil(function doWhat (next_batch) {

    // Increment the page number (or start off on page 0)
    pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

    // Find a batch of records' primary keys
    src.find({
      select: select,
      where: where,
      limit: BATCH_SIZE,
      skip: BATCH_SIZE * pageNo,
      from: {
        entity: src.entity,
        identity: src.identity
      }
    })
    .options({raw: true})
    .exec(function (err, _batchResults){
      if (err) return next_batch(err);

      // Expose `batchResults` in closure scope so it can be accessed
      // by `async.until()` for use in the halt predicate
      batchResults = _batchResults;

      // If a filter function was specified, run it on the batchResults
      var _filteredBatchResults;
      if (_.isFunction(filterFn)) {

        // The job of the `filterFn` is to apply an in-memory filter from
        // the previous recursive step on each new set of batch results.
        // This allows us to exclude records which are not actually
        // associated with the previous batch of results (this is because
        // a child criteria alone is not always sufficient to capture the
        // complexity of an association rule.)
        _filteredBatchResults = filterFn(batchResults);
      }
      else _filteredBatchResults = batchResults;


      // --------------------------------------------------------------------
      // <optimization: accumulate page results before recursive step>
      if (
        ENABLED_OPTIMIZATIONS.accumulatePageResults &&

        // If we have not traversed the entire collection yet,
        batchResults.length >= BATCH_SIZE &&
        // and there aren't enough `_filteredBatchResults` to be "worth it" to continue
        // with the recursive step(s) and spin up child cursors that will page over our
        // associated record collections,
        filteredBatchResults.length < MIN_NUM_INTERMEDIATE_RESULTS
      ) {
        // hold on to these filtered results so far, but also accumulate
        // another page of results before continuing to the recursive step(s).
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
        return next_batch();
      }

      // Otherwise just concat the new results to `filteredBatchResults` and continue forward.
      else {
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
      }
      // </optimization>
      // --------------------------------------------------------------------


      // console.log('page #'+pageNo);
      // console.log('filteredBatchResults:',_.pluck(filteredBatchResults, src.primaryKey));


      /**
       * finishBatch()
       *
       * Called when this batch of parent records is complete and
       * ready to be persisted to the local heap.
       *
       * @api private
       */
      function finishBatch () {

        // Now that all the backfiltering relying on child records is complete,
        // our `filteredBatchResults` is close to ready-- we no longer rely on
        // any asynchronous operations in order to calculate the final parent
        // result set we want to persist for this batch.
        //
        // It is important to realize that, up until this point, the
        // `localHeap` might have contained records that did not satisfy
        // the original WHERE criteria.
        //
        // So before continuing onward,  we use an in-memory filter to eliminate
        // those results which do not satisfy that original WHERE clause to avoid
        // adding extraneous records to the local heap (which, aside from being a
        // waste of resources, would lead to incorrect query results.)
        //
        // <optimization>
        // OPTIMIZE: skip this in-memory filter if the WHERE filter was already
        // applied (i.e. if the WHOSE criteria from a previous recursive step
        // would yield a proper subset of the records that the WHERE criteria
        // would yield.)  In that case, we can pass the complete WHERE directly
        // into the subcriteria (rather than the union of the populate..where and
        // the where..whose clauses), and so the relevant adapter will take care
        // of that logic for us.
        // </optimization>
        //
        // On the other hand, if the where..whose clause was NOT a proper subset
        // of the select..where clause, we had to union them together in order
        // to reuse these child records for backfiltering parent records (i.e. to
        // satsify WHOSE subqueries).  So we must prune `filteredBatchResults` here
        // to remove those records which do not satisfy the original WHERE.
        var doubleFilteredBatchResults = WLTransform(filteredBatchResults, { where: criteria.where }).results;

        // console.log('entity,identity:',criteria.from.entity, ',',criteria.from.identity);
        // console.log('original where clause:',criteria.where);
        // console.log('doubleFilteredBatchResults:',_.pluck(doubleFilteredBatchResults, src.primaryKey));

        // Then we can safely push `doubleFilteredBatchResults` to the
        // local heap.
        localHeap.push(src, doubleFilteredBatchResults);

        // Clear out accumulated `filteredBatchResults` to prepare
        // for the next page of parent candidates.
        filteredBatchResults = [];

        // Now we jump into the next batch of parent records.
        return next_batch();
      }


      // If there are no joins, skip ahead.
      if ( !Object.keys(joins).length ) {
        return finishBatch();
      }


      // -------------------------------------------------------
      // <async.each>
      //
      // If the criteria at the current cursor position has one
      // or more recursive SELECT clauses, (i.e. joins)
      // take the recursive step using the remaining child records
      // (or use optimized approach, i.e. call `.join()` in the adapter)
      // console.log('\n\n*~* JOINS *~*:',util.inspect(joins, false, null));
      async.each(Object.keys(joins), function eachJoin (attrName, next_association) {

        // console.log('something is going wrong with attribute: %s', attrName);

        // Lookup the association rule for this join
        var rule = src.getAssociationRule(attrName);
        if (!rule) {
          return next_association(new WLUsageError(util.format('Query failed - in relation %s, `.getAssociationRule()` returns no no valid AR for attribute: "%s"',src.identity, attrName)));
        }

        // Lookup the associated relation
        var otherRelation = rule.getOtherRelation();

        // Now build the actual subcriteria we'll pass down to the recursive step.
        var subcriteria = {

          select: (function _buildSELECT(){
            var subselect = {};

            // Always include primary key of the associated relation.
            // (REFACTOR: maybe we can remove this? it should be happening automatically
            // at the top of the recursive step anyway)
            subselect[otherRelation.primaryKey] = true;

            // Merge the nested SELECT modifier from the parent tree (`joins[attrName]`)
            // into the actual query object (`subcriteria`) that will be passed into the
            // recursive step. This will include both grandchild nested SELECT clauses
            // as well as primitive attributes.
            subselect = _.merge(subselect, joins[attrName].select);

            return subselect;
          })(),

          // TODO:
          // Pass in the `WHERE` clause here.
          // (i.e. this is the same thing whether it is the top-level `{where:{}}`
          //  or a nested `{select: {where:{...}}`)
          where: joins[attrName].where,

          // Build the FROM ("model" or "junction")
          from: {
            entity: otherRelation.entity,
            identity: otherRelation.identity
          }
        };


        // console.log('subcriteria BEFORE childFilter:', subcriteria);
        // console.log('flatWhere:', flatWhere);

        // Augment the subcriteria to ready it for use in the recursive step.
        subcriteria = rule.getCriteria(filteredBatchResults, subcriteria);

        // Build a synchronous filter function to be run on each page
        // of next parent results within the recursive step.
        var childFilterFn = rule.getChildFilter(filteredBatchResults, subcriteria, criteria);

        // Spawn a new child cursor (i.e. take the recursive step)
        // which is specific to:
        //  • the current association/attribute and its AR
        //  • the current batch of parent results
        return criteriaCursor({
          criteria: subcriteria,
          filter: childFilterFn,
          query: query,
          depth: depth+1
        },

        // NOTE:
        // `subcriteriaResults` does NOT exclude child records which failed
        // the `populate..where` filter. We need ALL of the child records
        // associated with this batch of parent records so we can use them
        // to apply the WHOSE filter and exclude the appropriate parent results.
        // Consequently, it would generally be OK for `subcriteriaResults` to be
        // a set of some kind of enhanced footprint- in every AR impelmented so far,
        // we haven't needed complete records (just need the PK or an FK, depending
        // on the AR.)
        //
        // For instance, the following example query searches for parent records
        // with friends named "frank", and populates all of their friends
        // named "lara".  So we need the "frank"s to make a determination about
        // the validity of the parent record, but we need the "lara"s for the
        // final result set.
        //
        // ```
        // {
        //   where: {
        //     friends: {
        //       whose: { name:'frank' }
        //     }
        //   },
        //   select: {
        //     friends: {
        //       where: {
        //         name: 'larry'
        //       }
        //     }
        //   }
        // }
        // ```
        function afterThisRecursiveStepIsComplete (err, subcriteriaResults) {
          if (err) return next_association(err);

          // Determine if this criteria has a subquery.
          var subquery = subqueries[attrName];
          var hasSubquery = _.isObject(subquery) && Object.keys(subquery).length;

          // If there is a subquery, use these `subcriteriaResults` from
          // the recursive step to eliminate parent results from this batch's
          // result set (i.e. `filteredBatchResults`)
          if ( hasSubquery ) {
            // Assertion:
            if (!subquery.whose) {
              return next_association(new WLError('Unexpected criteria syntax (missing `whose` in subquery)'));
            }

            // Use WLTransform to calculate which of the child records pass
            // the WHOSE subquery check.
            var childRecordsWhose = WLTransform(subcriteriaResults, {where: subquery.whose}).results;

            // These "backfiltered" results will consist of parent records who survived
            // the WHOSE check (i.e. their children survived the `childFilterFn()`
            // within the recursive step)
            var backfilteredBatchResults = (function _getBackfilteredBatchResults (){

              // The job of the `parentFilterFn()` is to prune parent batch results
              // WHOSE children failed the `childFilterFn()`
              var parentFilterFn = rule.getParentFilter(
                filteredBatchResults,subcriteria,criteria
              );

              // It does this by passing in `childRecordsWhose`.
              return parentFilterFn(childRecordsWhose);
            })();

            // Mutate `filteredBatchResults` in-place, removing parent records
            // whose children do not match the WHOSE subquery clause.
            // It is necessary to remove invalidated parent records like this
            // (rather than altogether replacing `filteredBatchResults` with our new
            // backfiltered results) because `filteredBatchResults` could have already
            // lost some of its parent records when it was pruned by a WHOSE subquery
            // from another association.
            var backfilteredBatchResultsPKValues = _.pluck(backfilteredBatchResults, src.primaryKey);
            filteredBatchResults = _.remove(filteredBatchResults, function (result) {
              return _.contains(backfilteredBatchResultsPKValues, result[src.primaryKey]);
            });
          }

          // Finally, continue on to the next association
          return next_association();
        });

      },


      ///////////////////////////////////////////////////////////////////////////
      // NOTE:
      // Backfilter (WHOSE + populate..WHERE) stuff could maybe live here, in
      // the `whenDoneWithAllJoins` callback, instead of in the callback from
      // the recursive step from each association.
      // (but then we'd have to accumulate child results across every association)
      // (currently, we accumulate the batch of parent results, but child results
      //  are local within the `async.each()`)
      ///////////////////////////////////////////////////////////////////////////
      function whenDoneWithAllJoins (err) {
        if (err) return next_batch(err);

        return finishBatch();
      });
      // </async.each>
      // -------------------------------------------------------

    });
  },
  function doUntil () {

    // Keep batching until the batch returns fewer than BATCH_SIZE results.
    if (batchResults.length < BATCH_SIZE) {
      return true;
    }
    else {
      return false;
    }
  },

  function whenDoneWithAllBatches (err) {
    if (err) return cb(err);

    // Send one final query to the parent relation to "fulfill"
    // the footprints and turn them into complete records in the
    // top-level query heap.
    src.find({

      from: criteria.from,

      where: (function _topFootprintWHEREClause () {
        var where = {};

        // Pick off the first LIMIT footprints and pluck their
        // primary key values.  Then use them for our IN query.
        where[src.primaryKey] = (function _topFootprintPKValues() {
          var footprints;
          footprints = localHeap.get(src);
          footprints = WLTransform.sort(footprints, criteria.sort);
          footprints = _.first(footprints, criteria.limit||30);
          footprints = _.pluck(footprints, src.primaryKey);
          return footprints;
        })();
        return where;
      })(),

      select: select //??? why isn't this criteria.select? ???
    })
    .options({
      raw: true,
      purpose: 'hydrate footprints' // purely advisory (for development/testing)
    })
    .exec(function (err, results) {
      if (err) return cb(err);

      // Push results onto the top-level heap
      heap.push(src, results);

      // We're done! The heap is up to date.

      // Still pass back the liberal `results` though, since they'll be used
      // to call the `parentFilterFn` and backfilter WHOSE subqueries.
      return cb(null, results);

    });
  });
}


module.exports = criteriaCursor;
