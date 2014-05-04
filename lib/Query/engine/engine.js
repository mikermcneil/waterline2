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


/**
 * #Query Engine
 *
 * The query engine traverses the given `operationsTree` and runs
 * each one recursively using the appropriate adapter(s), database(s),
 * and method(s) from the given query's ORM instance.
 *
 * The query engine generates a QueryCache.  As operations complete,
 * this function iteratively stores its results in the cache.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result stream.
 *
 * @param {Object} operationsTree
 * @param {Query} parentQuery
 * @param {Function} cb
 */

module.exports = function engine (operationsTree, parentQuery, cb) {

  // Grab hold of the parentQuery's ORM, cache, and constructor
  var orm = parentQuery.orm;
  var cache = parentQuery.cache;

  // Run the top-level operation
  // (other sub-operations will be run recursively)
  runOperation(operationsTree, null, cb);
  return;


  /**
   * Recursive, asynchronous function which runs the specified operation.
   *
   * @param  {Object} operation  - a branch of an ancestral operations tree, or the tree itself
   * @param  {Function} cb   - callback
   */
  function runOperation (operation, additionalFilter, cb) {
    // console.log('runOperation:', operation);

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

    /////////////////////////////////////////////////////////////////
    // (STEP 1: RUN RAW PARENT QUERY IN BATCHES)
    /////////////////////////////////////////////////////////////////

    // Build SELECT clause
    var select = {};

    // Always select the primary key
    select[primaryKey] = true;

    _.each(srcModel.associations, function (assoc, relation) {

    });
    select[primaryKey] = true;

    // TODO:
    // Build SELECT clause using only the primary key + any relevant foreign keys
    // (relevant meaning there exists subselects that depend on them for `via` of a N.1 or N.M association)
    // select['petHuman'] = true;
    // For now, grab everything!!!
    _.each(srcModel.attributes, function (def,attrName){
      select[attrName] = true;
    });
    ////////////////////////////////////////

    // Build WHERE clause for this batched query by calculating
    // the intersection of the current `where` operation, as well
    // as the "backfilter" (i.e. nested WHERE modifiers.)
    //
    // Keep in mind this is the WHERE for a **RAW** query-
    // that is, we're pretty much communicating with the physical
    // adapter directly, and so we have to be liberal in the data
    // we're grabbing. Everything actually still works even if
    // we specify no WHERE criteria at all.
    //
    // This is the `where` for our "parent" model, i.e. the one
    // that we're batching.
    var where = {};
    _.extend(where, flatWhere);


    // TODO:
    // Potential Optimization #1:
    // Calculate hashes and cache query explanations to keep track
    // of whether, for a particular query, it is more efficient to
    // split the "backfilter" and `where` criteria into two separate
    // batches of subqueries, or to stick with the approach described
    // above (taking the intersection and filtering the extras in-memory)
    //
    // Potential Optimization #2:
    // Implement concurrent binary search, e.g.:
    // 1, 2, 3, ..., 24
    // 25, 26, ..., 49
    // 50, 51, 52, ..., 99
    // (would need to maintain a rough idea of COUNT and take advantage
    //  of SORT to make this efficient.  A SORT condition would need to
    //  be artificially introduced for each WHERE condition.)

    // For each batch of records:
    // (or, when possible, using a more optimized approach)
    var pageNo;
    var batchResults;
    var filteredBatchResults;
    var localQueryCache = new QueryCache();
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


        //
        // The QueryCache itself enforces the current operation's
        // `skip`, `limit`, and `sort` modifiers.  When the QC was
        // instantiated, it remembered the `limit`, `skip`, and `sort`
        // rules from the original query syntax, so when records are
        // pushed onto the QC, we can rest assured they are being
        // automatically reduced accordingly.
        // (e.g. if cache entries don't fit w/i the limit, QC deletes
        // existing results for that model which are worse matches)
        //

        // console.log('batch results for "%s":',modelIdentity,batchResults);

        // Run "soft" (in-memory) WHERE filter on batch.
        //
        // TODO: explore putting this WHERE filter on the QueryCache
        // instance itself- might simplify the code in this file.

        // Keep track of `filteredBatchResults`
        // (in most cases, actually store only the ids and
        // sort vector values - since we have to re-find the
        // records by id at the end anyways to respect limit,
        // skip, and sort on nested suboperations)
        //
        // Eventually, these values will be added to our
        // QueryCache instance.

        filteredBatchResults = batchResults;
        // console.log('applying additionalFilter to "%s"s :: ', modelIdentity, additionalFilter);
        // if (additionalFilter === false) {
        //   console.log('THERE SHOULD BE NO CATS');
        //   filteredBatchResults = [];
        // }
        // else if (additionalFilter !== null) {
        //   filteredBatchResults = WLFilter(batchResults, {
        //     where: additionalFilter
        //   }).results;
        // }
        // else {
        //   filteredBatchResults = WLFilter(batchResults, {
        //     where: flatWhere
        //   }).results;
        // }
        // console.log('filteredBatchResults for '+modelIdentity+':',filteredBatchResults);


        /////////////////////////////////////////////////////////////////
        // (STEP 2: PERFORM SUBOPERATIONS)
        /////////////////////////////////////////////////////////////////

        // Next, it's time to take care of joins.
        var joins = extractSubTree(operation, 'select');

        // If there are no joins, we're done.
        if ( !Object.keys(joins).length ) {

          // console.log('checking %s',modelIdentity);
          // _.each(orm.model(modelIdentity).associations, function (val, assocName) {
          //   console.log('checking assoc',assocName);
          // });
          // // cache.get()
          // console.log('done with batch of %s', modelIdentity, 'now applying the in-memory filter if necessary...');
          // filteredBatchResults = WLFilter(filteredBatchResults, additionalFilter).results;
          // console.log('using filter:',additionalFilter,'got:',filteredBatchResults);
          // // Push our results to the `localQueryCache`.
          // console.log('pushed %d "%s"s to the local query cache', filteredBatchResults.length, modelIdentity);
          localQueryCache.push(modelIdentity, filteredBatchResults);
          // console.log('Leaf\'s ('+modelIdentity+') local QC:',localQueryCache);

          return next_batch();
        }

        // If the operation at the current cursor position has one
        // or more recursive SELECT clauses, (i.e. joins)
        // take the recursive step using the remaining child records
        // (or use optimized approach, i.e. call `.join()` in the adapter)
        else {
          // console.log('Skipping joins',joins);

          async.each(Object.keys(joins), function (attrName, next_subop) {
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
            console.log('\n**SUBOP',subop);
            console.log('\nsubselect',subselect);


            // Merge in some special stuff to the criteria to
            // limit the results to child records associated with
            // these parent records.

            // First, etermine the WHERE criteria that will be
            // necessary to pull this off.
            //
            // (currently only address 1.N and N.1 use cases, where
            // foreign keys are stored on either the parent or child side-
            // TODO: support the rest-- e.g. M.N associations w/ join tables)
            //
            // TODO: pull this into the WHERE modifier method on the Query prototype
            // e.g.
            // var q = new Query();
            // q.where(_.pick(filteredBatchResults))
            //
            // TODO: merge in the select...where criteria instead of ignoring it




            if (assoc.type === '1-->N') {

              // Pluck the foreign key values from the original batch results
              // then strip records where a foreign key is undefined.
              inValues = _.pluck(filteredBatchResults, assoc.foreignKeys[subop.from]);
              inValues = pruneUndefined(inValues);
              // console.log('assoc::',assoc);
              // console.log('looking up %s in assoc\'s foreign keys:',subop.from, assoc.foreignKeys);
              // console.log('filteredBatchResults',filteredBatchResults);
              // console.log('plucked "%s" to get invalues:: %s',assoc.foreignKeys[subop.from], inValues);

              // Get subop primary key
              var subopPrimaryKey = otherModel.primaryKey;

              // 1.N :: Foreign key is on parent model.
              // Have subop find child records where:
              // child[primaryKey] -IN- parents[foreignKey]
              subop.where[primaryKey] = inValues;

              // Now take the recursive step and run the suboperation.
              // console.log('Taking recursive step (%s)', assoc.type,'::', subop);
              doRecursiveStep(subop, subselect, next_subop);
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
              console.log('== SUBOP.WHERE ==', subop.where);
              // console.log('==== will there be a subquery for %s? Heres what I think:',attrName, subqueries[attrName]);


              // ==============
              // Build an additional filter for the suboperation that will be run in-memory,
              // removing the subop results.
              // (this is because we have to find more things than we want to keep in
              //  order to exhaustively search the child dataset)
              // subselect.where[assoc.foreignKeys[modelIdentity]] = inValues;
              // console.log('== addtl filter ==', subselect);

              // var subAdditionalFilter = null;
              // _.reduce(subselect.select, function (memo, sub,attrName) {
              //   if ()
              //   memo[attrName] = ;
              //   return memo;
              // }, {});


              // Now take the recursive step and run the suboperation.
              doRecursiveStep(subop, subselect, next_subop);
              return;
            }

            else if ( assoc.type === 'N<->M' || assoc.type === 'N-->M') {

              // // Determine Junction (i.e. join table) and its keys
              // Junction = assoc.junction;
              // var fkToParent = assoc.foreignKeys[srcModel.identity];
              // var fkToChild = assoc.foreignKeys[otherModel.identity];
              // var junctionPk = assoc.keeper.primaryKey;

              // // Build junction operation
              // var junctionOp = {select: {}, where: {}};
              // junctionOp.select[junctionPk] = true;
              // junctionOp.select[fkToChild] = true;
              // junctionOp.select[fkToParent] = true;
              // junctionOp.where[fkToParent] = _.pluck(filteredBatchResults, primaryKey);

              // // TODO: Instead of inlining logic for running the junction
              // // operation, we could maintain our own copy of the operation
              // // tree and rebuild it to include junctions.
              // //
              // // TODO: We could include the ability for a suboperation to
              // // pass back a `prune` option (e.g. { trim: [23,29,91] }), or
              // // just modify the cache for the parent directly, for use w/
              // // subqueries, where we don't know whether a parent record
              // // should be included in the result set until one or more child
              // // operations has been run.

              // // Run junction operation (in batches)
              // var pageNo;
              // var intermediateResults;
              // async.doUntil(function (next_junction_batch) {

              //   // Increment the page number (or start off on page 0)
              //   pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

              //   // Find a batch of intermediate results
              //   Junction.find({
              //     from: Junction.identity,
              //     where: junctionOp.where,
              //     select: junctionOp.select,
              //     limit: BATCH_SIZE,
              //     skip: BATCH_SIZE * pageNo
              //   })
              //   .options({raw: true})
              //   .exec(function (err, _intermediateResults) {
              //     if (err) return next_junction_batch(err);

              //     // Expose `intermediateResults` for use in `until` predicate below.
              //     intermediateResults = _intermediateResults;

              //     // Now build subop
              //     // (user isn't aware of the Junction step,
              //     // so the operation syntax isn't either)
              //     _.merge(subop, subselect);

              //     subop.where[primaryKey] = _.pluck(intermediateResults, fkToChild);

              //     // Now take the recursive step and run the suboperation.
              //     doRecursiveStep(subop, next_junction_batch);
              //     return;
              //   });
              // }, function until (){
              //   // Keep batching until the batch returns fewer
              //   // than BATCH_SIZE results.
              //   if (intermediateResults.length < BATCH_SIZE) {
              //     return true;
              //   }
              //   else return false;
              // }, function afterwards(err) {
              //   return next_subop(err);
              // });

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
            function doRecursiveStep (subop, additionalFilter, doRecursiveStep_cb) {


              // Note:
              // This function depends on closure vars including (but not limited to):
              //  -> `assoc`
              //  -> `attrName`

              // Now run the suboperation.
              // console.log('running subop:', util.inspect(subop, false, null));
              runOperation(subop, additionalFilter, function (err, subopResults) {
                if (err) return doRecursiveStep_cb(err);

                var subquery = subqueries[attrName];

                // console.log('OK, isthere a subq?', subquery);
                // console.log('subopResults:',subopResults);

                // If there is a subquery (nested WHERE clause), and the child
                // operation returned subopResults, use them to enforce a nested
                // WHERE clause (ie. subquery) in-memory.
                // (diff them with the stuff already in the cache and
                // remove extra entries)
                if (
                  subopResults.length &&
                  _.isObject(subquery) &&
                  Object.keys(subquery).length
                ) {

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
                  console.log('filtered subop results', filteredSubopResults);
                  // console.log('the filtered results:', filteredSubopResults);
                  // var filteredSubopResultIds = _.pluck(filteredSubopResults, assoc.target.primaryKey);
                  // console.log('filteredSubopResultIds:', filteredSubopResultIds);
                  // console.log('subop.from', subop.from);

                  // Now use our filteredSubopResults to calculate the set of parent records to omit
                  // (looking at their primary key values)
                  // console.log('(parent records getting filtered by this subq, before theyre filtered:) "filteredBatchResults"', filteredBatchResults);
                  // console.log('originalResultIds/filteredSubopResultIds', originalResultIds, filteredSubopResultIds);
                  // console.log('removeCriteria', _.difference(originalResultIds, filteredSubopResultIds));
                  // var backfilteredBatchResults = applyBackfilter({
                  //   src: filteredBatchResults,
                  //   model: orm.model(subop.from),
                  //   removeCriteria: _.difference(originalResultIds, filteredSubopResultIds)
                  // });

                  // Precalculate the plucked primary key values for each resulting "other model"
                  var subopResultIds = _.pluck(subopResults, otherModel.primaryKey);

                  // Apply min, max, and whose:
                  var backfilteredBatchResults;
                  console.log('???',assoc.type, filteredBatchResults);
                  if (assoc.type === '1-->N') {
                    // console.log('???',assoc.type, filteredBatchResults);
                    backfilteredBatchResults = _.remove(filteredBatchResults, function (parentResult) {
                      return _.contains(subopResultIds, parentResult[assoc.foreignKeys[subop.from]]);
                    });
                  }
                  else if ( assoc.type === 'N<->1' ) {
                    // console.log('-----::::::::',assoc);

                    // console.log('subquery.whose', subquery.whose);
                    // backfilteredBatchResults = WLFilter(filteredBatchResults, {where: subquery.whose}).results;
                    backfilteredBatchResults = _.remove(filteredBatchResults, function (parentResult) {
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


                  // Push our results to the `localQueryCache`.
                  // console.log('from', subop.from);
                  console.log('pushed %d "%s"s to the local query cache', backfilteredBatchResults.length, modelIdentity);
                  localQueryCache.push(modelIdentity, backfilteredBatchResults);
                  // console.log('pushed:\n',backfilteredBatchResults,' to subop\'s ('+subop.from+') local QC as "'+modelIdentity+'" `toOmit`:', localQueryCache);
                } // </if>

                // If there is no subquery, just push the batch results to
                // the localQueryCache and call it good
                else {
                  console.log('pushed %d "%s"s to the local query cache', filteredBatchResults.length, modelIdentity);
                  localQueryCache.push(modelIdentity, filteredBatchResults);
                }

                // Continue
                doRecursiveStep_cb();
              });
            }

          }, function whenDoneWithBatch (err) {

            console.log('done with batch of %s', modelIdentity);

            // Get next batch of records and continue.
            next_batch(err);
          });
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
};



