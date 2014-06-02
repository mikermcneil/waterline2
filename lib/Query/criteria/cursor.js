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


// Extremely stupid logger used only during development:
//<dumblog>
var log = {};
log.debug = function (){ console.log.apply(console, Array.prototype.slice.call(arguments)); };
log.skip = function (){};
//</dumblog>


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
  // log.skip('New cursor:', criteria);

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

  // console.log('FROM:',criteria.from, 'CRITERIA:',criteria);

  // Locate `src` relation (model or junction)
  var src = lookupRelationFrom(criteria.from, orm);
  if (!src) {
    return cb(new WLError(util.format('"%s" does not exist in the ontology (should be a known model or junction)',criteria.from)));
  }

  log.skip('***** criteriaCursor() on "%s" *****', src.identity,'\n::',src,'\n • primaryKey: '+src.primaryKey);


  // Compute a flattened version of the WHERE clause
  // This eliminates nested WHEREs (aka subqueries) and is used
  // for the raw query, but also for the in-memory WLTransform below.
  var flatWhere = flattenClause(criteria.where);

  log.skip('%s :: flatWhere:',src.identity, flatWhere);

  // Lookup subqueries for simpler access
  var subqueries = extractSubTree(criteria, 'where');

  // Next, it's time to take care of joins.
  var joins = extractSubTree(criteria, 'select');
  log.skip(' (**)  criteria  (**)');
  log.skip(criteria);
  log.skip(' (==)  JOINS  (==)');
  log.skip(util.inspect(joins,false,null));
  log.skip(' (/==)       (/==)');



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
  log.skip('Raw query, `src.attributes`:',src.attributes);
  log.skip('FROM=',src.identity,'primaryKey:',src.primaryKey,'starting SELECT:',select);
  _.each(src.attributes, function (def,attrName){
    log.skip('• adding '+attrName);
    select[attrName] = true;
  });
  log.skip('resulting SELECT:',select);

  // Build WHERE clause for the raw query
  var where = {};
  _.extend(where, flatWhere);

  var pageNo;
  var batchResults;
  var filteredBatchResults = [];
  var localQueryHeap = new QueryHeap({
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
    log.skip('finding "%s"s where... ', src.identity, where);
    log.skip('(flatWhere == ',flatWhere);

    var batchCriteria = {
      select: select,
      where: where,
      limit: BATCH_SIZE,
      skip: BATCH_SIZE * pageNo,
      from: {
        entity: src.entity,
        identity: src.identity
      }
    };

    log.skip('Executing raw paging query=', batchCriteria);


    src.find(batchCriteria)
    .options({raw: true})
    .exec(function (err, _batchResults){
      if (err) return next_batch(err);

      // Expose `batchResults` for use in `until` predicate below.
      batchResults = normalizeAdapterOutput(_batchResults, orm);
      log.skip('# _batchResults from adapter',batchResults.length);

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
        log.skip('Performing accumulation optimization... accumulated %d results so far.', filteredBatchResults.length);
        return next_batch();
      }

      // Otherwise just concat the new results to `filteredBatchResults` and continue forward.
      else {
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
      }

      // </optimization>
      //

      log.skip('**\npage #'+pageNo+'\nfinding from:',src.identity,'\nselect:',util.inspect(query.criteria.select, false, null),'\nLimit:'+BATCH_SIZE+'\nskip:'+(BATCH_SIZE*pageNo));
      log.skip('# batchResults:', batchResults.length);
      log.skip('# _filteredBatchResults:', _filteredBatchResults.length);
      log.skip('# filteredBatchResults:', filteredBatchResults.length);

      /////////////////////////////////////////////////////////////////
      // (STEP 2: EVALUATE SUBCRITERIA)
      /////////////////////////////////////////////////////////////////

      // If there are no joins, we're done.
      // Push filteredBatchResults to the local query heap
      if ( !Object.keys(joins).length ) {

        log.skip('(No joins.)');
        assert(_.isArray(filteredBatchResults),
          'unexpected type ('+typeof filteredBatchResults+') for `filteredBatchResults`:\n'+
          util.inspect(filteredBatchResults));
        log.skip('pushed %d "%s"s to the local query heap', filteredBatchResults.length, src);

        localQueryHeap.push(src, filteredBatchResults);

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
          var subselect = joins[attrName];

          // Lookup the association rule for this join
          var rule = src.getAssociationRule(attrName);
          if (!rule) {
            return next_association(new WLUsageError(util.format('Query failed - "%s" model has no association "%s" association rule',src.identity, attrName)));
          }

          // Lookup the associated relation
          var otherRelation = rule.getOtherRelation();

          // Now build the actual subcriteria we'll pass down to the recursive step.
          var subcriteria = { select: {}, where: {} };

          // Build the FROM ("model" or "junction")
          subcriteria.from = {
            entity: otherRelation.entity,
            identity: otherRelation.identity
          };

          // Always include primary key of the associated relation.
          // (TODO: maybe we can remove this? it should be happening automatically in recursive step)
          subcriteria.select[otherRelation.primaryKey] = true;

          // Merge the nested SELECT modifier from the parent tree (`joins[attrName]`)
          // into the actual query object (`subcriteria`) that will be passed into the
          // recursive step. This will include both grandchild nested SELECT clauses
          // as well as primitive attributes.
          _.merge(subcriteria.select, joins[attrName].select);

          log.debug('SUBCRITERIA:',subcriteria);
          log.debug('OTHER RELATION:', otherRelation.identity, '(a '+otherRelation.entity+')');

          // Augment the subcriteria to ready it for use in the recursive step.
          subcriteria = rule.getCriteria(filteredBatchResults, subcriteria);

          // Build a synchronous filter function (to be run on each page of child results)
          var childFilterFn = rule.getChildFilter(filteredBatchResults, subcriteria, query);

          // Spawn a new child cursor (i.e. take the recursive step)
          // which is specific to:
          //  • the current association/attribute and its AR
          //  • the current batch of parent results
          doRecursiveStep(subcriteria, childFilterFn, next_association);


          // TODO: finish this

          // var foreignKey;
          // var inValues;

          // if (assoc.type === '1-->N') {

          //   // Pluck the foreign key values from the original batch results
          //   // then strip records where a foreign key is undefined.
          //   inValues = _.pluck(filteredBatchResults, assoc.foreignKeys[subcriteria.from]);
          //   inValues = pruneUndefined(inValues);

          //   // Get subcriteria primary key
          //   var subcriteriaPrimaryKey = otherRelation.primaryKey;

          //   // In a 1.N, foreign key is on parent model.
          //   subcriteria.where[primaryKey] = inValues;

          //   // Apply flat select..where filters to subcriteria
          //   subcriteria.where = _.merge(subcriteria.where, flattenClause(joins[attrName].where));

          //   // Now take the recursive step and run the subcriteria.
          //   doRecursiveStep(subcriteria, function  memfilter(subResults) {

          //     var childPK = otherRelation.primaryKey;
          //     var parentFK = assoc.foreignKeys[otherRelation.identity];
          //     var subquery = subqueries[attrName];

          //     // Eliminate unnecessary subResults:
          //     var subResultsWhose;
          //     if (subquery && subquery.whose) {
          //       log.skip('subResultsWhose criteria', subquery.whose);
          //       subResultsWhose = WLTransform(subResults, {where: subquery.whose}).results;
          //     }
          //     else subResultsWhose = subResults;

          //     // Find the parent results linked to these subResults
          //     // (since in a 1-->N, the parent result holds the foreign key)
          //     var childPKs = _.pluck(subResultsWhose, childPK);
          //     log.skip('subResultsWhose', subResultsWhose);
          //     log.skip('filteredBatchResults (%s)', src.identity, _.pluck(filteredBatchResults, primaryKey));
          //     log.skip('childPKs in subResultsWhose (%s)', otherRelation.identity, childPKs);
          //     log.skip('using FK on (%s):', primaryKey, parentFK);
          //     var linkedParentResults = _.where(filteredBatchResults, function (parentResult) {
          //       return _.contains(childPKs, parentResult[parentFK]);
          //     });
          //     log.skip('()-()-()-()-()-()-() linkedParentResults:',linkedParentResults);

          //     // Now that we have the linked parent results from this batch, we can
          //     // use them to look up ALL of the possible child results:
          //     subResults = _.where(subResults, function (subResult) {
          //       return _.contains(_.pluck(linkedParentResults, parentFK), subResult[childPK]);
          //     });

          //     // TODO: (optimization)
          //     // On the other hand, if the query does NOT have a nested select on
          //     // this attribute, we only need to keep the child records found as
          //     // part of the subquery (`subResultWhose`) instead of the entire set
          //     // of all associated child records (`subResults`)

          //     return subResults;
          //   }, next_association);
          //   return;
          // }

          // else if ( assoc.type === 'N<->1' ) {

          //   // Build up a set of pk values from parent model
          //   // to use as the criteria for the child query.
          //   inValues = _.pluck(filteredBatchResults, primaryKey);
          //   inValues = pruneUndefined(inValues);

          //   log.skip('assoc::',assoc);
          //   log.skip('looking up %s in assoc\'s foreign keys:',src.identity, assoc.foreignKeys);
          //   log.skip('filteredBatchResults',filteredBatchResults);
          //   log.skip('plucked "%s" to get invalues:: %s',assoc.foreignKeys[src.identity], inValues);

          //   // N.1 :: Foreign key is on child model.
          //   // Have subcriteria find child records where:
          //   // child[fk] =IN= parents[pk]
          //   subcriteria.where[assoc.foreignKeys[src.identity]] = inValues;

          //   // Apply flat select..where filters to subcriteria
          //   subcriteria.where = _.merge(subcriteria.where, flattenClause(joins[attrName].where));

          //   // TODO: (optimization)
          //   // Compute union w/ other WHERE clause from the subselect
          //   // (i.e. { select: { pets: { where: {name: 'fluffy'} } } })
          //   // (will narrow down search for child records w/i the adapter)
          //   // var inMemoryFilter = criteriaUnion(subWhose, subSelectWhere);

          //   // Now take the recursive step and run the subcriteria.
          //   doRecursiveStep(subcriteria, function memfilter (subResults) {

          //     var childPK = otherRelation.primaryKey;
          //     var childFK = assoc.foreignKeys[src.identity];
          //     var subquery = subqueries[attrName];

          //     // Eliminate unnecessary subResults:
          //     var subResultsWhose;
          //     if (subquery && subquery.whose) {
          //       log.skip('subResultsWhose criteria', subquery.whose);
          //       subResultsWhose = WLTransform(subResults, {where: subquery.whose}).results;
          //     }
          //     else subResultsWhose = subResults;

          //     log.skip('subresults:', subResults);//_.pluck(subResults, otherRelation.primaryKey));
          //     log.skip('subResultsWhose', subResultsWhose);
          //     log.skip('filteredBatchResults (%s)', src.identity, _.pluck(filteredBatchResults, primaryKey));

          //     // Extract a set of foreign key values out of those subquery-"whose"-filtered
          //     // subresults (`fkValuesOfChildRecords`).  Now we have an array of foreign keys
          //     // we can use to match other child records which might belong to this batch of
          //     // parent results.
          //     //
          //     var fkValuesOfChildRecords = _.pluck(subResultsWhose, childFK);
          //     subResults = _.where(subResults, function (subResult) {
          //       return _.contains(fkValuesOfChildRecords, subResult[childFK]);
          //     });

          //     log.skip('final filtered subresults (%s.%s)', src.identity, attrName, _.pluck(subResults, otherRelation.primaryKey));

          //     // TODO: (optimization)
          //     // On the other hand, if the query does NOT have a nested select on
          //     // this attribute, we only need to keep the child records found as
          //     // part of the subquery (`subResultWhose`) instead of the entire set
          //     // of all associated child records (`subResults`)
          //     return subResults;
          //   }, next_association);
          //   return;
          // }

          // else if ( assoc.type === 'N<->M' || assoc.type === 'N-->M') {

          //   // Use the association rule to get the criteria to use in
          //   // the recursive step, as well as the function for filtering
          //   // each of its result batches.
          //   var rule = src.getAssociationRule(attrName);
          //   var subCriteria = rule.getChildCriteria(filteredBatchResults, subselect, query);
          //   var futureFilter = rule.getChildFilter(filteredBatchResults, subselect, query);

          //   // Take the recursive step
          //   return doRecursiveStep(subCriteria, futureFilter, next_association);
          // }
          // else {
          //   // wtf?
          //   return next_association(new WLUsageError('Unrecognized association definition in model schema, or invalid nested "select" in query syntax (i.e. populates/joins/projections)'));
          // }


          /**
           * This function will execute `criteriaCursor()` recursively,
           * but it does some work first.
           *
           * @param  {[type]} subcriteria              [description]
           * @param  {[type]} doRecursiveStep_cb [description]
           */
          function doRecursiveStep (subcriteria, filter, doRecursiveStep_cb) {

            log.skip('\n~~~ STARTING NEW RECURSIVE STEP ~~~\n(%s.%s --> %s)\n-----\n%s\n-----\n',src.identity, attrName, otherRelation.identity, util.inspect(subcriteria));
            // Note:
            // This function depends on closure vars including (but not limited to):
            //  -> `assoc`
            //  -> `attrName`

            // Now run the subcriteria.
            log.skip('running subcriteria:', util.inspect(subcriteria, false, null));
            criteriaCursor({
              criteria: subcriteria,
              filter: filter,
              query: query
            }, function (err, subcriteriaResults) {
              if (err) return doRecursiveStep_cb(err);

              // Determine if this criteria has a subquery.
              var subquery = subqueries[attrName];
              // var hasSubquery = subcriteriaResults.length && _.isObject(subquery) && Object.keys(subquery).length;
              var hasSubquery = _.isObject(subquery) && Object.keys(subquery).length;

              log.skip('Does %s.%s have a related subquery?', src.identity, attrName, hasSubquery,'::',subquery);

              log.skip('OK, isthere a subq?', subquery);
              log.skip('subcriteriaResults:',subcriteriaResults);

              // If there is no subquery, just push the batch results to
              // the localQueryHeap and call it good
              if ( !hasSubquery ) {

                log.skip('-- OK! --');
                log.skip('(No subquery.)');
                log.skip('pushed %d "%s"s to the local query heap', filteredBatchResults.length, src.identity);
                log.skip('--  /  --');
                // localQueryHeap.push(src.identity, filteredBatchResults);
              }

              // If there is a subquery (nested WHERE clause), and the child
              // criteria returned subcriteriaResults, use them to enforce a nested
              // WHERE clause (ie. subquery) in-memory.
              // (diff them with the stuff already in the heap and
              // remove extra entries)
              else {
                log.skip('otherRelation.primaryKey:', otherRelation.primaryKey);

                // Assertion:
                if (!subquery.whose) {
                  return doRecursiveStep_cb(new WLError('Unexpected criteria syntax (missing `whose` in subquery)'));
                }

                // Use WLTransform to calculate which of the sub-results
                // from this batch should be allowed to remain in the heap.
                log.skip('WLTransform ',subcriteriaResults,'on ',subquery);
                var filteredSubcriteriaResults = WLTransform(subcriteriaResults, {where: subquery.whose}).results;
                log.skip('filtered subcriteria (%s.%s) results', src.identity, attrName, filteredSubcriteriaResults);

                // Precalculate the plucked primary key values for each resulting "other model"
                var subcriteriaResultIds = _.pluck(subcriteriaResults, otherRelation.primaryKey);

                // Apply min, max, and whose:
                var backfilteredBatchResults;
                log.skip('???',assoc.type, filteredBatchResults);
                if (assoc.type === '1-->N') {
                  log.skip('???',assoc.type, filteredBatchResults);
                  log.skip('subquery.whose', subquery.whose);
                  backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                    var parentFKValue = parentResult[assoc.foreignKeys[subcriteria.from]];
                    var subcriteriaPKs = _.pluck(filteredSubcriteriaResults, otherRelation.primaryKey);
                    log.skip('parentFKValue:',parentFKValue);
                    log.skip('subcriteriaPKs:',subcriteriaPKs);
                    return _.contains(subcriteriaPKs, parentFKValue);
                  });
                  log.skip('backfiltered parent results (1-->N)', backfilteredBatchResults);
                }
                else if ( assoc.type === 'N<->1' ) {
                  log.skip('ACTUALLLY PERFORMING BACKFILTER ON N<->1 (%s.%s)', src.identity, attrName);
                  // backfilteredBatchResults = WLTransform(filteredBatchResults, {where: subquery.whose}).results;
                  backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                    var parentPKValue = parentResult[src.primaryKey];
                    var subcriteriaFKs = _.pluck(filteredSubcriteriaResults, assoc.foreignKeys[src.identity]);
                    return _.contains(subcriteriaFKs, parentPKValue);
                  });
                  log.skip('backfiltered parent results', backfilteredBatchResults);
                  // var backfilterCriteria = {};
                  // backfilteredBatchResults = WLTransform(filteredBatchResults, backfilterCriteria).results;

                  log.skip(assoc.foreignKeys[subcriteria.from]);
                }
                else if ( assoc.type === 'N<->M' || assoc.type === 'N-->1' ) {
                  // TODO
                  // .....?????
                  // Potentially need to have another, different sort of futureFilter here...

                }


                // Experimental:
                // Don't push results to local query heap- instead, intersect them with
                // the main batch of results (`filteredBatchResults`).
                log.skip('Reduced filteredBatchResults from:', _.pluck(filteredBatchResults, src.primaryKey));
                filteredBatchResults = _.remove(filteredBatchResults, function (r) {
                  return _.contains(_.pluck(backfilteredBatchResults, src.primaryKey), r[src.primaryKey]);
                });
                log.skip('to:', _.pluck(filteredBatchResults, src.primaryKey));
                log.skip('using:', _.pluck(backfilteredBatchResults, src.primaryKey));
                log.skip('-----***~~~~~~*****~~~~******~~~~------');
                //
                // The push to the local query heap won't happen until all joins have been explored.
                //

                // Push our results to the `localQueryHeap`.
                log.skip('from', subcriteria.from);
                log.skip('-- OK! --');
                log.skip('(Ran subquery.)');
                log.skip('pushed %d "%s"s to the local query heap', backfilteredBatchResults.length, src.identity);
                // localQueryHeap.push(src.identity, backfilteredBatchResults);
                log.skip('--  /  --');
                log.skip('pushed:\n',backfilteredBatchResults,' to subcriteria\'s ('+subcriteria.from+') local QC as "'+src.identity+'" `toOmit`:', localQueryHeap);
              } // </if>

              // Continue
              doRecursiveStep_cb();
            });
          }

        },

        // Done w/ each join, and therefore done w/ this batch.
        // Get next batch of records and continue.
        function whenDoneWithAsyncEach (err) {
          log.skip('done with batch of %s', src.identity);

          // TODO:
          // backfilter stuff should really live here

          log.skip('-- OK! --');
          log.skip('(No subquery.)');
          log.skip('pushed %d "%s"s to the local query heap', filteredBatchResults.length, src.identity);
          log.skip('--  /  --');
          log.skip('---> filteredBatchResults', filteredBatchResults);

          localQueryHeap.push(src, filteredBatchResults);

          // Clear out accumulated `filteredBatchResults`
          filteredBatchResults = [];

          next_batch(err);

        }); // </async.each>
      }
    });
  },
  function doUntil () {
    log.skip('checking for more batches of "%s"',src.identity, '(batchResults.length < BATCH_SIZE, '+batchResults.length + ' < '+BATCH_SIZE+')');

    // Keep batching until the batch returns fewer
    // than BATCH_SIZE results.
    if (batchResults.length < BATCH_SIZE) {
      return true;
    }
    else return false;
  },

  function afterwards(err) {
    if (err) return cb(err);

    log.skip('HEAP',heap);

    /////////////////////////////////////////////////////////////////
    // (STEP 3: RUN FINAL QUERY TO SELECT THE REST OF THE FIELDS)
    /////////////////////////////////////////////////////////////////

    log.skip('in afterwards, now its time to do the final query. localQueryHeap::', localQueryHeap);

    // Run a final IN query (using the ids and sort indices from
    // the VEERRRY beginning of all these shenanigans)
    // to expand the heap to include the complete result set.
    // TODO: explore pulling this "expand" logic into QC itself
    var inCriteria = {
      where: {},
      from: criteria.from
    };

    // Build SELECT clause
    inCriteria.select = select;

    // Pick off the first LIMIT footprints
    var finalInCriteria = localQueryHeap.get(src);
    finalInCriteria = WLTransform.sort(finalInCriteria, criteria.sort);
    finalInCriteria = _.first(finalInCriteria, criteria.limit||30);
    finalInCriteria = _.pluck(finalInCriteria, src.primaryKey);

    // Build WHERE clause
    inCriteria.where[src.primaryKey] = finalInCriteria;


    log.skip('in criteria:',inCriteria);

    // Use the ids we've been building up do a final query
    // to the source model to get complete records
    src.find(inCriteria)
    .options({raw: true})
    .exec(function (err, results) {
      if (err) return cb(err);

      results = normalizeAdapterOutput(results, orm);

      // Replace ids in the top-level QueryHeap
      // w/ the complete results (all selected fields).
      // heap.wipe(src.identity);

      // Push results onto the QueryHeap
      heap.push(src, results);
      log.skip('pushed %d "%s"s to heap:',heap.get(src).length, src.identity, results);

      // We're done, the heap is ready.
      // On to the integrator, but pass along the `results`
      // in case any records need to be removed from a parent
      // criteria.
      cb(null, results);

    });
  });
}


module.exports = criteriaCursor;





/**
 * Tolerate unexpected results from adapter
 *
 * @param  {[type]} adapterResults [description]
 * @param  {[type]} orm            [description]
 * @return {[type]}                [description]
 */
function normalizeAdapterOutput(adapterResults, orm) {

  if (!_.isArray(adapterResults)) {

    // To support WL1 core, if the result looks like a record,
    // just wrap it and treat it as a single-item array.
    // (e.g. this is a `findOne()` and it somehow got snipped)
    //
    // This can probably be removed in the future.
    if (orm.compatibilityMode && _.isObject(adapterResults)) {
      adapterResults = [adapterResults];
    }
    else {
      // TODO: log warning that an unexpected result was returned, along with
      // the name of the adapter, the datastore, the model, and the criteria in
      // the query that triggered the issue (as well as the fact that this was
      // a "find()" query.)
      orm.emit('warn', 'Received unexpected result from adapter in find(): '+util.inspect(adapterResults));
      adapterResults = [];
    }
  }

  return adapterResults;
}
