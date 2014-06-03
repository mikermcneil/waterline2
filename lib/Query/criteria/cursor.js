/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var WLTransform = require('waterline-criteria');

var applyBackfilter = require('./apply-backfilter');
var extractSubTree = require('./syntax/extract-subtree');
var flattenClause = require('./syntax/flatten-clause');
var criteriaUnion = require('./syntax/criteria-union');
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

  /////////////////////////////////////////////////////////////////////////////
  // (STEP 0: PRECOMPUTE QUERY METADATA WE'LL NEED IN SUBSEQUENT STEPS)
  /////////////////////////////////////////////////////////////////////////////

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
  // This eliminates nested WHEREs (aka subqueries) and is used
  // for the raw query, but also for the in-memory WLTransform below.
  var flatWhere = flattenClause(criteria.where);

  // Lookup subqueries for simpler access
  var subqueries = extractSubTree(criteria, 'where');

  // Next, it's time to take care of joins.
  var joins = extractSubTree(criteria, 'select');

  /////////////////////////////////////////////////////////////////
  // (STEP 1: RUN RAW PARENT QUERY IN BATCHES)
  /////////////////////////////////////////////////////////////////

  // Build SELECT clause for the raw query
  // TODO:
  // Build SELECT clause using only the primary key + any relevant foreign keys
  // (relevant meaning there exists subselects that depend on them for `via` of a N.1 or N.M association)
  // select['petHuman'] = true;
  var select = {};
  // Always select the parent's primary key
  select[src.primaryKey] = true;
  // For now, grab everything!!!
  _.each(src.attributes, function (def,attrName){
    select[attrName] = true;
  });

  // Build WHERE clause for the raw query
  var where = _.cloneDeep(flatWhere);

  var pageNo;
  var batchResults;
  var filteredBatchResults = [];

  // In addition to the top-level public query heap,
  // each cursor within a query needs its own local heap.
  var localHeap = new QueryHeap({
    orm: orm,
    skip: criteria.skip || 0,
    limit: criteria.limit || 30,
    sort: criteria.sort || {},
    footprint: true
  });

  //
  // TODO: use an optimized (O(C)) approach if possible to skip the paging step.
  // TODO: this could be taken care of in the query optimizer beforehand, modifying
  // the query plan to make it more explicit.
  // Even then, the plan would need to be inspected at this point to determine
  // whether to page or not to page.
  //

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
        _filteredBatchResults = filterFn(batchResults);
      }
      else _filteredBatchResults = batchResults;


      //
      // <optimization: accumulate page results before recursive step>
      //
      if (
        ENABLED_OPTIMIZATIONS.accumulatePageResults &&

        // If we have not traversed the entire collection yet,
        batchResults.length >= BATCH_SIZE &&
        // and there aren't enough `_filteredBatchResults` to be "worth it" to continue
        // with the recursive step,
        filteredBatchResults.length < MIN_NUM_INTERMEDIATE_RESULTS
      ) {
        // hold on to these filtered results, but also accumulate another page
        // of results before continuing.
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
        return next_batch();
      }

      // Otherwise just concat the new results to `filteredBatchResults` and continue forward.
      else {
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
      }

      // </optimization>
      //

      /////////////////////////////////////////////////////////////////
      // (STEP 2: EVALUATE SUBCRITERIA)
      /////////////////////////////////////////////////////////////////

      console.log('page #'+pageNo);
      console.log('filteredBatchResults:',_.pluck(filteredBatchResults, src.primaryKey));

      // If there are no joins, we're done.
      // Push filteredBatchResults to the local query heap
      if ( !Object.keys(joins).length ) {
        localHeap.push(src, filteredBatchResults);

        // Clear out accumulated `filteredBatchResults` to prepare
        // for the next page of parent candidates.
        filteredBatchResults = [];

        return next_batch();
      }

      // If the criteria at the current cursor position has one
      // or more recursive SELECT clauses, (i.e. joins)
      // take the recursive step using the remaining child records
      // (or use optimized approach, i.e. call `.join()` in the adapter)
      else {
        async.each(Object.keys(joins), function eachJoin (attrName, next_association) {

          // Lookup the association rule for this join
          var rule = src.getAssociationRule(attrName);
          if (!rule) {
            return next_association(new WLUsageError(util.format('Query failed - "%s" model has no association "%s" association rule',src.identity, attrName)));
          }

          // Lookup the associated relation
          var otherRelation = rule.getOtherRelation();

          // Now build the actual subcriteria we'll pass down to the recursive step.
          var subcriteria = {

            select: (function _buildSELECT(){
              var subselect = {};

              // Always include primary key of the associated relation.
              // (TODO: maybe we can remove this? it should be happening automatically in recursive step)
              subselect[otherRelation.primaryKey] = true;

              // Merge the nested SELECT modifier from the parent tree (`joins[attrName]`)
              // into the actual query object (`subcriteria`) that will be passed into the
              // recursive step. This will include both grandchild nested SELECT clauses
              // as well as primitive attributes.
              subselect = _.merge(subselect, joins[attrName].select);

              return subselect;
            })(),

            where: {},

            // Build the FROM ("model" or "junction")
            from: {
              entity: otherRelation.entity,
              identity: otherRelation.identity
            }
          };

          // console.log('SUBCRITERIA:',subcriteria);
          // console.log('OTHER RELATION:', otherRelation.identity, '(a '+otherRelation.entity+')');

          // Augment the subcriteria to ready it for use in the recursive step.
          subcriteria = rule.getCriteria(filteredBatchResults, subcriteria);

          // Build a synchronous filter function (to be run on each page of child results)
          var childFilterFn = rule.getChildFilter(filteredBatchResults, subcriteria, query);

          // Spawn a new child cursor (i.e. take the recursive step)
          // which is specific to:
          //  • the current association/attribute and its AR
          //  • the current batch of parent results
          return doRecursiveStep(subcriteria, childFilterFn, next_association);


          /**
           * This function will execute `criteriaCursor()` recursively,
           * but it does some work first.
           *
           * @param  {[type]} subcriteria              [description]
           * @param  {[type]} doRecursiveStep_cb [description]
           */
          function doRecursiveStep (subcriteria, filter, doRecursiveStep_cb) {

            // Note:
            // This function depends on closure vars including (but not limited to):
            //  -> `assoc`
            //  -> `attrName`

            // Now pass the subcriteria down to the child cursor
            // (i.e. take the recursive step)
            return criteriaCursor({
              criteria: subcriteria,
              filter: filter,
              query: query,
              depth: depth+1
            }, function (err, subcriteriaResults) {
              if (err) return doRecursiveStep_cb(err);

              // Determine if this criteria has a subquery.
              var subquery = subqueries[attrName];
              var hasSubquery = _.isObject(subquery) && Object.keys(subquery).length;

              // If there is no subquery, just continue
              if ( !hasSubquery ) {
                return doRecursiveStep_cb();
              }

              // Assertion:
              if (!subquery.whose) {
                return doRecursiveStep_cb(new WLError('Unexpected criteria syntax (missing `whose` in subquery)'));
              }

              // Use WLTransform to calculate which of the child records pass
              // the WHOSE subquery check.
              var childRecordsWhose = WLTransform(subcriteriaResults, {where: subquery.whose}).results;

              // to remain in the heap.

              // These "backfiltered" results are parent records which survived
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

              console.log('filteredBatchResults:',filteredBatchResults);

              // Remove `filteredBatchResults` that should be filtered out
              // (this is sort of unnecessary, but leaving it since its modifying closure scope
              //  and it seems like a good idea to be explicit about that)
              var backfilteredBatchResultsPKValues = _.pluck(backfilteredBatchResults, src.primaryKey);
              filteredBatchResults = _.remove(filteredBatchResults, function (result) {
                return _.contains(backfilteredBatchResultsPKValues, result[src.primaryKey]);
              });

              // Continue on to the next association
              return doRecursiveStep_cb();

            });
          }

        },

        // Done w/ all joins, and therefore done w/ this batch.
        // Get next batch of records and continue.
        function whenDoneWithAllJoins (err) {

          // TODO:
          // backfilter stuff should really maybe live here..?

          localHeap.push(src, filteredBatchResults);

          // Clear out accumulated `filteredBatchResults`
          filteredBatchResults = [];

          next_batch(err);

        }); // </async.each>
      }
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
    .options({raw: true})
    .exec(function (err, results) {
      if (err) return cb(err);

      // Push results onto the top-level heap
      heap.push(src, results);

      // We're done! The heap is up to date.
      // Still pass back the `results` though, since they'll be used
      // to call the parentFilterFn and honor WHERE subqueries.
      return cb(null, results);

    });
  });
}


module.exports = criteriaCursor;
