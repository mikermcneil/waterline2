/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var async = require('async');
var WLFilter = require('waterline-criteria');
var WLError = require('../../WLError');
var QueryCache = require('./QueryCache');
var WLUsageError = require('../../WLError/WLUsageError');
var extractSubTree = require('./extractSubTree');
var flattenOperation = require('../../../util/flattenOperation');
var pruneUndefined = require('../../../util/pruneUndefined');
var applyBackfilter = require('./applyBackfilter');
var criteriaUnion = require('./criteriaUnion');





/**
 * Recursive, asynchronous function which runs the specified operation.
 *
 * @param  {Object} operation  - a branch of an ancestral operations tree, or the tree itself
 * @param  {Function} cb   - callback
 */

function runOperation (options, cb) {
  // console.log('runOperation:', operation);

  /////////////////////////////////////////////////////////////////////////////
  // (STEP 0: PRECOMPUTE QUERY METADATA WE'LL NEED IN SUBSEQUENT STEPS)
  /////////////////////////////////////////////////////////////////////////////

  // Parse options
  var operation = options.operations;
  var query = options.query;
  var filterFn = options.filter;

  // Grab hold of the query's ORM, cache, and constructor
  // (these are the same for each recursive step)
  var orm = query.orm;
  var cache = query.cache;


  var DEFAULT_LIMIT = 30;
  var BATCH_SIZE = 100;

  var modelIdentity = operation.from;
  var srcModel = orm.model(modelIdentity);
  var primaryKey = srcModel.primaryKey;

  if (!srcModel) {
    return cb(new WLError(util.format('Unknown model: %s',modelIdentity)));
  }

  // Compute a flattened version of the WHERE clause
  // This eliminates nested WHEREs (aka subqueries) and is used
  // for the raw query, but also for the in-memory WLfilter below.
  var flatWhere = flattenOperation(operation.where);

  // Lookup subqueries for simpler access
  var subqueries = extractSubTree(operation, 'where');

  // Next, it's time to take care of joins.
  var joins = extractSubTree(operation, 'select');






  /////////////////////////////////////////////////////////////////
  // (STEP 1: RUN RAW PARENT QUERY IN BATCHES)
  /////////////////////////////////////////////////////////////////

  // Build SELECT clause for the raw query
  // TODO:
  // Build SELECT clause using only the primary key + any relevant foreign keys
  // (relevant meaning there exists subselects that depend on them for `via` of a N.1 or N.M association)
  // select['petHuman'] = true;
  var select = {};
  // Always select the primary key
  select[primaryKey] = true;
  _.each(srcModel.associations, function (assoc, relation) {});
  // For now, grab everything!!!
  _.each(srcModel.attributes, function (def,attrName){
    select[attrName] = true;
  });

  // Build WHERE clause for the raw query
  var where = {};
  _.extend(where, flatWhere);


  // For each batch of records:
  // (or, when possible, using a more optimized approach)
  var pageNo;
  var batchResults;
  var filteredBatchResults;
  var localQueryCache = new QueryCache({orm: orm});
  async.doUntil(function doWhat (next_batch) {

    // Increment the page number (or start off on page 0)
    pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;


    // Find a batch of records' primary keys
    console.log('finding "%s"s where... ', srcModel.identity, where);
    // console.log('(flatWhere == ',flatWhere);
    srcModel.find({
      select: select,
      where: where,
      from: modelIdentity,
      limit: BATCH_SIZE,
      skip: BATCH_SIZE * pageNo
    })
    .options({raw: true})
    .exec(function (err, _batchResults){
      if (err) return next_batch(err);

      // Expose `batchResults` for use in `until` predicate below.
      batchResults = _batchResults;


      // If a filter function was specified, run it on the batchResults
      if (_.isFunction(filterFn)) {
        filteredBatchResults = filterFn(batchResults);
        console.log('(%s) got:',modelIdentity, filteredBatchResults);
      }
      else filteredBatchResults = batchResults;

      /////////////////////////////////////////////////////////////////
      // (STEP 2: PERFORM SUBOPERATIONS)
      /////////////////////////////////////////////////////////////////

      // If there are no joins, we're done.
      // Push parent results to the query cache
      if ( !Object.keys(joins).length ) {

        // TODO:
        // figure out how to (for a given batch) look at all of the associations holistically.
        // i.e. we shouldn't push stuff to the localQueryCache unless we're sure we actually need it.
        // If we don't, it's just a waste of space, and worse yet, it could even unseat another item
        // as we're performing our in-memory sort/skip/limit/where/map/reduce, and mess up the sort order,
        // or even the contents of the result set.
        //
        // The best way to solve this might be to take the recursive step for ALL of the associations
        // of a particular type (i.e. petCat, belongsToCat, previousCats) at once.
        // Unfortunately, this is complicated by nested associations, but it would allow us to have our
        // localQueryCache truly represent the entirety of one "level" of our recursive operationsTree parsing.
        //
        // I don't know the right answer yet.
        // ~Mike.

        console.log('-- OK! --');
        console.log('(No joins.)');
        console.log('pushed %d "%s"s to the local query cache', filteredBatchResults.length, modelIdentity);
        localQueryCache.push(modelIdentity, filteredBatchResults);
        console.log('--  /  --');
        return next_batch();
      }

      // If the operation at the current cursor position has one
      // or more recursive SELECT clauses, (i.e. joins)
      // take the recursive step using the remaining child records
      // (or use optimized approach, i.e. call `.join()` in the adapter)
      else {
        async.each(Object.keys(joins), function eachJoin (attrName, next_subop) {
          var subselect = joins[attrName];

          // Lookup information about this subop/association
          var assoc = srcModel.associations[attrName];
          if (!assoc) {
            return next_subop(new WLUsageError(util.format('Query failed - "%s" model has no "%s" association',modelIdentity, attrName)));
          }
          var attrDef = srcModel.attributes[attrName];
          var from = attrDef.model || attrDef.collection;
          var otherModel = orm.model(from);
          var foreignKey;
          var Junction;
          var inValues;

          // Now build the actual physical suboperation we'll call w/ raw queries.
          var subop = { from: from, select: {}, where: {} };
          // Always include primary key of the related entity.
          // (TODO: remove this- it should be happening automatically)
          subop.select[assoc.target.primaryKey] = true;

          // Build SELECT clause using the nested `select` modifier
          // that was specified.
          _.merge(subselect, subop);
          subselect = subop;

          if (assoc.type === '1-->N') {

            // Pluck the foreign key values from the original batch results
            // then strip records where a foreign key is undefined.
            inValues = _.pluck(filteredBatchResults, assoc.foreignKeys[subop.from]);
            inValues = pruneUndefined(inValues);

            // Get subop primary key
            var subopPrimaryKey = otherModel.primaryKey;

            // In a 1.N, foreign key is on parent model.
            subop.where[primaryKey] = inValues;

            // Now take the recursive step and run the suboperation.
            doRecursiveStep(subop, function  memfilter(subResults) {

              var childPK = otherModel.primaryKey;
              var parentFK = assoc.foreignKeys[otherModel.identity];
              var subquery = subqueries[attrName];

              // Eliminate unnecessary subResults:
              var subResultsWhose;
              if (subquery && subquery.whose) {
                console.log('subResultsWhose criteria', subquery.whose);
                subResultsWhose = WLFilter(subResults, {where: subquery.whose}).results;
              }
              else subResultsWhose = subResults;

              // Find the parent results linked to these subResults
              // (since in a 1-->N, the parent result holds the foreign key)
              var childPKs = _.pluck(subResultsWhose, childPK);
              console.log('subResultsWhose', subResultsWhose);
              console.log('filteredBatchResults (%s)', modelIdentity, _.pluck(filteredBatchResults, primaryKey));
              console.log('childPKs in subResultsWhose (%s)', otherModel.identity, childPKs);
              console.log('using FK on (%s):', primaryKey, parentFK);
              var linkedParentResults = _.where(filteredBatchResults, function (parentResult) {
                return _.contains(childPKs, parentResult[parentFK]);
              });
              console.log('()-()-()-()-()-()-() linkedParentResults:',linkedParentResults);

              // Now that we have the linked parent results from this batch, we can
              // use them to look up ALL of the possible child results:
              subResults = _.where(subResults, function (subResult) {
                return _.contains(_.pluck(linkedParentResults, parentFK), subResult[childPK]);
              });

              // Extract a set of foreign key values out of those subquery-"whose"-filtered
              // subresults (`fkValuesOfChildRecords`).  Now we have an array of foreign keys
              // we can use to match other child records which might belong to this batch of
              // parent results.
              //
              // var fkValuesOfChildRecords = _.pluck(subResultsWhose, childFK);
              // subResults = _.where(subResults, function (subResult) {
              //   return _.contains(fkValuesOfChildRecords, subResult[childFK]);
              // });

              // TODO: (optimization)
              // On the other hand, if the query does NOT have a nested select on
              // this attribute, we only need to keep the child records found as
              // part of the subquery (`subResultWhose`) instead of the entire set
              // of all associated child records (`subResults`)

              return subResults;
            }, next_subop);
            return;
          }

          else if ( assoc.type === 'N<->1' ) {

            // Build up a set of pk values from parent model
            // to use as the criteria for the child query.
            inValues = _.pluck(filteredBatchResults, primaryKey);
            inValues = pruneUndefined(inValues);

            // console.log('assoc::',assoc);
            // console.log('looking up %s in assoc\'s foreign keys:',modelIdentity, assoc.foreignKeys);
            // console.log('filteredBatchResults',filteredBatchResults);
            // console.log('plucked "%s" to get invalues:: %s',assoc.foreignKeys[modelIdentity], inValues);

            // N.1 :: Foreign key is on child model.
            // Have subop find child records where:
            // child[fk] =IN= parents[pk]
            subop.where[assoc.foreignKeys[modelIdentity]] = inValues;

            // TODO: (optimization)
            // Compute union w/ other WHERE clause from the subselect
            // (i.e. { select: { pets: { where: {name: 'fluffy'} } } })
            // (will narrow down search for child records w/i the adapter)
            // var inMemoryFilter = criteriaUnion(subWhose, subSelectWhere);

            // Now take the recursive step and run the suboperation.
            doRecursiveStep(subop, function memfilter (subResults) {

              var childPK = otherModel.primaryKey;
              var childFK = assoc.foreignKeys[modelIdentity];
              var subquery = subqueries[attrName];

              // Eliminate unnecessary subResults:
              var subResultsWhose;
              if (subquery && subquery.whose) {
                console.log('subResultsWhose criteria', subquery.whose);
                subResultsWhose = WLFilter(subResults, {where: subquery.whose}).results;
              }
              else subResultsWhose = subResults;

              console.log('subresults:', subResults);//_.pluck(subResults, otherModel.primaryKey));
              console.log('subResultsWhose', subResultsWhose);
              console.log('filteredBatchResults (%s)', modelIdentity, _.pluck(filteredBatchResults, primaryKey));

              // Extract a set of foreign key values out of those subquery-"whose"-filtered
              // subresults (`fkValuesOfChildRecords`).  Now we have an array of foreign keys
              // we can use to match other child records which might belong to this batch of
              // parent results.
              //
              var fkValuesOfChildRecords = _.pluck(subResultsWhose, childFK);
              subResults = _.where(subResults, function (subResult) {
                return _.contains(fkValuesOfChildRecords, subResult[childFK]);
              });

              console.log('final filtered subresults (%s.%s)', modelIdentity, attrName, _.pluck(subResults, otherModel.primaryKey));

              // TODO: (optimization)
              // On the other hand, if the query does NOT have a nested select on
              // this attribute, we only need to keep the child records found as
              // part of the subquery (`subResultWhose`) instead of the entire set
              // of all associated child records (`subResults`)
              return subResults;
            }, next_subop);
            return;
          }

          else if ( assoc.type === 'N<->M' || assoc.type === 'N-->M') {
            // See .stuff/many-to-many.js
          }
          else {
            // wtf?
            return next_subop(new WLUsageError('Unrecognized association syntax'));
          }


          /**
           * This function will execute `runOperation()` recursively,
           * but it does some work first.
           *
           * @param  {[type]} subop              [description]
           * @param  {[type]} doRecursiveStep_cb [description]
           */
          function doRecursiveStep (subop, filter, doRecursiveStep_cb) {

            console.log('\n~~~ STARTING NEW RECURSIVE STEP ~~~\n(%s.%s --> %s)\n',modelIdentity, attrName, otherModel.identity);
            // Note:
            // This function depends on closure vars including (but not limited to):
            //  -> `assoc`
            //  -> `attrName`

            // Now run the suboperation.
            // console.log('running subop:', util.inspect(subop, false, null));
            runOperation({
              operations: subop,
              filter: filter,
              query: query
            }, function (err, subopResults) {
              if (err) return doRecursiveStep_cb(err);

              // Determine if this operation has a subquery.
              var subquery = subqueries[attrName];
              // var hasSubquery = subopResults.length && _.isObject(subquery) && Object.keys(subquery).length;
              var hasSubquery = _.isObject(subquery) && Object.keys(subquery).length;

              console.log('Does %s.%s have a related subquery?', modelIdentity, attrName, hasSubquery,'::',subquery);

              // console.log('OK, isthere a subq?', subquery);
              // console.log('subopResults:',subopResults);

              // If there is no subquery, just push the batch results to
              // the localQueryCache and call it good
              if ( !hasSubquery ) {

                // console.log('-- OK! --');
                // console.log('(No subquery.)');
                // console.log('pushed %d "%s"s to the local query cache', filteredBatchResults.length, modelIdentity);
                // console.log('--  /  --');
                // localQueryCache.push(modelIdentity, filteredBatchResults);
              }

              // If there is a subquery (nested WHERE clause), and the child
              // operation returned subopResults, use them to enforce a nested
              // WHERE clause (ie. subquery) in-memory.
              // (diff them with the stuff already in the cache and
              // remove extra entries)
              else {

                // var originalResultIds = _.pluck(filteredSubopResults, assoc.target.primaryKey);
                // console.log('assoc.target.primaryKey:', assoc.target.primaryKey);
                // console.log('originalResultIds:', originalResultIds);

                // Assertion:
                if (!subquery.whose) {
                  return doRecursiveStep_cb(new WLError('Unexpected operation syntax (missing `whose` in subquery)'));
                }

                // Use WLFilter to calculate which of the sub-results
                // from this batch should be allowed to remain in the cache.
                // console.log('WLFilter ',subopResults,'on ',subquery);
                var filteredSubopResults = WLFilter(subopResults, {where: subquery.whose}).results;
                console.log('filtered subop (%s.%s) results', modelIdentity, attrName, filteredSubopResults);

                // Precalculate the plucked primary key values for each resulting "other model"
                var subopResultIds = _.pluck(subopResults, otherModel.primaryKey);

                // Apply min, max, and whose:
                var backfilteredBatchResults;
                // console.log('???',assoc.type, filteredBatchResults);
                if (assoc.type === '1-->N') {
                  // console.log('???',assoc.type, filteredBatchResults);
                  // console.log('subquery.whose', subquery.whose);
                  backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                    var parentFKValue = parentResult[assoc.foreignKeys[subop.from]];
                    var subopPKs = _.pluck(filteredSubopResults, otherModel.primaryKey);
                    // console.log('parentFKValue:',parentFKValue);
                    // console.log('subopPKs:',subopPKs);
                    return _.contains(subopPKs, parentFKValue);
                  });
                  console.log('backfiltered parent results (1-->N)', backfilteredBatchResults);
                }
                else if ( assoc.type === 'N<->1' ) {
                  console.log('ACTUALLLY PERFORMING BACKFILTER ON N<->1 (%s.%s)', modelIdentity, attrName);
                  // backfilteredBatchResults = WLFilter(filteredBatchResults, {where: subquery.whose}).results;
                  backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                    // console.log('~~~~~~~If "'+modelIdentity+'"s "'+primaryKey+'" (',parentResult[primaryKey],') is in',filteredSubopResultIds, 'im keeping it (',_.contains(filteredSubopResultIds, parentResult[primaryKey]),')');
                    var parentPKValue = parentResult[primaryKey];
                    var subopFKs = _.pluck(filteredSubopResults, assoc.foreignKeys[modelIdentity]);
                    return _.contains(subopFKs, parentPKValue);
                  });
                  console.log('backfiltered parent results', backfilteredBatchResults);
                  // var backfilterCriteria = {};
                  // backfilteredBatchResults = WLFilter(filteredBatchResults, backfilterCriteria).results;

                  // console.log(assoc.foreignKeys[subop.from]);
                }


                // Experimental:
                // Don't push results to local query cache- instead, intersect them with
                // the main batch of results (`filteredBatchResults`).
                console.log('Reduced filteredBatchResults from:', _.pluck(filteredBatchResults, primaryKey));
                filteredBatchResults = _.remove(filteredBatchResults, function (r) {
                  return _.contains(_.pluck(backfilteredBatchResults, primaryKey), r[primaryKey]);
                });
                console.log('to:', _.pluck(filteredBatchResults, primaryKey));
                console.log('using:', _.pluck(backfilteredBatchResults, primaryKey));
                console.log('-----***~~~~~~*****~~~~******~~~~------');
                //
                // The push to the local query cache won't happen until all joins have been explored.
                //

                // Push our results to the `localQueryCache`.
                // console.log('from', subop.from);
                // console.log('-- OK! --');
                // console.log('(Ran subquery.)');
                // console.log('pushed %d "%s"s to the local query cache', backfilteredBatchResults.length, modelIdentity);
                // localQueryCache.push(modelIdentity, backfilteredBatchResults);
                // console.log('--  /  --');
                // console.log('pushed:\n',backfilteredBatchResults,' to subop\'s ('+subop.from+') local QC as "'+modelIdentity+'" `toOmit`:', localQueryCache);
              } // </if>

              // Continue
              doRecursiveStep_cb();
            });
          }

        },

        // Done w/ each join, and therefore done w/ this batch.
        // Get next batch of records and continue.
        function whenDoneWithAsyncEach (err) {
          console.log('done with batch of %s', modelIdentity);

          // TODO:
          // backfilter stuff should really live here

          console.log('-- OK! --');
          console.log('(No subquery.)');
          console.log('pushed %d "%s"s to the local query cache', filteredBatchResults.length, modelIdentity);
          console.log('--  /  --');
          localQueryCache.push(modelIdentity, filteredBatchResults);

          next_batch(err);

        }); // </async.each>
      }
    });
  },
  function doUntil () {
    // console.log('checking');

    // Keep batching until the batch returns fewer
    // than BATCH_SIZE results.
    if (batchResults.length < BATCH_SIZE) {
      return true;
    }
    else return false;
  },

  function afterwards(err) {
    if (err) return cb(err);

    // console.log('CACHE',cache);

    /////////////////////////////////////////////////////////////////
    // (STEP 3: RUN FINAL QUERY TO SELECT THE REST OF THE FIELDS)
    /////////////////////////////////////////////////////////////////

    // console.log('in afterwards, now its time to do the final query. localQueryCache::', localQueryCache);

    // Run a final IN query (using the ids and sort indices from
    // the VEERRRY beginning of all these shenanigans)
    // to expand the cache to include the complete result set.
    // TODO: explore pulling this "expand" logic into QC itself
    var inCriteria = {
      from: modelIdentity,
      where: {}
    };
    // Build SELECT clause
    inCriteria.select = select;

    // Build WHERE clause
    inCriteria.where[primaryKey] = _.pluck(localQueryCache.get(modelIdentity), primaryKey);

    // console.log('in criteria:',inCriteria);

    // Use the ids we've been building up do a final query
    // to the source model to get complete records
    srcModel.find(inCriteria)
    .options({raw: true})
    .exec(function (err, results) {
      if (err) return cb(err);

      // Replace ids in the top-level QueryCache
      // w/ the complete results (all selected fields).
      // cache.wipe(modelIdentity);

      // Push results onto the QueryCache
      cache.push(modelIdentity, results);
      console.log('pushed %d "%s"s to cache:',cache.get(modelIdentity).length, modelIdentity);

      // We're done, the cache is ready.
      // On to the integrator, but pass along the `results`
      // in case any records need to be removed from a parent
      // operation.
      cb(null, results);

    });
  });
}


module.exports = runOperation;
