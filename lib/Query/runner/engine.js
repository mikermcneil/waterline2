/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var async = require('async');
var WLFilter = require('waterline-criteria');
var WLError = require('../../WLError');
var WLUsageError = require('../../WLError/WLUsageError');
var extractSubTree = require('./extractSubTree');
var flattenValues = require('../../../util/flattenValues');



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
 * it that new data is available to push to its result RecordStream.
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
  runOperation(operationsTree, cb);

  // Chainable
  return parentQuery;



  /**
   * Recursive, asynchronous function which runs the specified operation.
   *
   * @param  {Object} operation  - a branch of an ancestral operations tree, or the tree itself
   * @param  {Function} cb   - callback
   */
  function runOperation (operation, cb) {
    var DEFAULT_LIMIT = 30;
    var BATCH_SIZE = 100;

    var modelIdentity = operation.from;
    var srcModel = orm.model(modelIdentity);
    var primaryKey = srcModel.primaryKey;

    if (!srcModel) {
      return cb(new WLError(util.format('Unknown model: %s',modelIdentity)));
    }

    // Lookup subqueries for simpler access
    var subqueries = extractSubTree(operation, 'where');

    // For each batch of records:
    // (or, when possible, using a more optimized approach)
    var pageNo;
    var batchResults;
    async.doUntil(function doWhat (next_batch) {

      // Increment the page number (or start off on page 0)
      pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

      // Build SELECT clause
      var select = {};

      // Always select the primary key
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

      // TODO:
      // Build WHERE clause for this batched query by calculating
      // the intersection of the current `where` operation, as well
      // as the "backfilter".
      //
      // Keep in mind this is the WHERE for a **RAW** query-
      // that is, we're pretty much communicating with the physical
      // adapter directly, and so we have to be liberal in the data
      // we're grabbing.
      //
      // Potential Optimization:
      // Calculate hashes and cache query explanations to keep track
      // of whether, for a particular query, it is more efficient to
      // split the "backfilter" and `where` criteria into two separate
      // batches of subqueries, or to stick with the approach described
      // above (taking the intersection and filtering the extras in-memory)
      var where = {};


      // Find a batch of records' primary keys
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

        // Flatten nested WHEREs if necessary to make sure
        // WLfilter works properly.
        var flatWhere = flattenValues(operation.where);


        // Run "soft" (in-memory) WHERE filter on batch.
        // TODO: explore putting this WHERE filter on the QueryCache
        // instance itself- might simplify the code in this file.
        var remainingResults = WLFilter(batchResults, {
          where: flatWhere
        }).results;


        // Store remaining results in cache (or store only the ids and
        // values for the sort vector)
        cache.push(modelIdentity, remainingResults);


        /////////////////////////////////////////////////////////////////
        // Next, it's time to take care of joins.
        var joins = extractSubTree(operation, 'select');

        // If there are no joins, we're done.
        if ( !Object.keys(joins).length ) {
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

            // Now build the suboperation.
            var subop = { from: from, select: {}, where: {} };

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
            // q.where(_.pick(remainingResults))
            //
            // TODO: merge in the select...where criteria instead of ignoring it

            var _1_TO_N = 1; // 1.N
            var _N_TO_1 = 2; // N.1
            var _N_TO_M = 3; // N.M
            var associationType;

            // 1.N
            if (attrDef.model) {
              associationType = _1_TO_N;

              // Build SELECT clause using the nested `select` modifier
              // that was specified.
              _.merge(subop, subselect);
              // But always include primary key of the related entity.
              subop.select[assoc.primaryKey] = true;


              // Pluck the foreign key values from the original batch results
              // then strip records where a foreign key is undefined.
              var fkValues = _.pluck(remainingResults, attrName);
              fkValues = _.remove(fkValues, function (fkValue) {
                return fkValue !== undefined;
              });
              subop.where[primaryKey] = fkValues;

              // Now take the recursive step and run the suboperation.
              doRecursiveStep(subop, next_subop);
              return;
            }
            // N.1
            else if (
              attrDef.collection && attrDef.via &&
              otherModel.attributes[attrDef.via] &&
              otherModel.attributes[attrDef.via].model
            ) {
              associationType = _N_TO_1;

              _.merge(subop, subselect);

              // Determine FK
              foreignKey = attrDef.via;
              subop.where[foreignKey] = _.pluck(remainingResults, primaryKey);

              // Now take the recursive step and run the suboperation.
              doRecursiveStep(subop, next_subop);
              return;
            }
            // N.M
            else if (
              (attrDef.collection && !attrDef.via) ||
              (attrDef.collection && attrDef.via &&
              otherModel.attributes[attrDef.via] &&
              otherModel.attributes[attrDef.via].collection &&
              otherModel.attributes[attrDef.via].via === attrName)
            ) {
              associationType = _N_TO_M;

              // Determine Junction (i.e. join table) and its keys
              Junction = assoc.Junction;
              var foreignKeys = assoc.foreignKeys;
              var fkToParent = assoc.foreignKeys[srcModel.identity];
              var fkToChild = assoc.foreignKeys[otherModel.identity];
              var junctionPk = assoc.primaryKey;

              // Build junction operation
              var junctionOp = {select: {}, where: {}};
              junctionOp.select[junctionPk] = true;
              junctionOp.select[fkToChild] = true;
              junctionOp.select[fkToParent] = true;
              junctionOp.where[fkToParent] = _.pluck(remainingResults, primaryKey);

              // TODO: Instead of inlining logic for running the junction
              // operation, we could maintain our own copy of the operation
              // tree and rebuild it to include junctions.
              //
              // TODO: We could include the ability for a suboperation to
              // pass back a `prune` option (e.g. { trim: [23,29,91] }), or
              // just modify the cache for the parent directly, for use w/
              // subqueries, where we don't know whether a parent record
              // should be included in the result set until one or more child
              // operations has been run.

              // Run junction operation (in batches)
              var pageNo;
              var intermediateResults;
              async.doUntil(function (next_junction_batch) {

                // Increment the page number (or start off on page 0)
                pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

                // Find a batch of intermediate results
                Junction.find({
                  from: Junction.identity,
                  where: junctionOp.where,
                  select: junctionOp.select,
                  limit: BATCH_SIZE,
                  skip: BATCH_SIZE * pageNo
                })
                .options({raw: true})
                .exec(function (err, _intermediateResults) {
                  if (err) return next_junction_batch(err);

                  // Expose `intermediateResults` for use in `until` predicate below.
                  intermediateResults = _intermediateResults;

                  // Now build subop
                  // (user isn't aware of the Junction step,
                  // so the operation syntax isn't either)
                  _.merge(subop, subselect);

                  subop.where[primaryKey] = _.pluck(intermediateResults, fkToChild);

                  // Now take the recursive step and run the suboperation.
                  doRecursiveStep(subop, next_junction_batch);
                  return;
                });
              }, function until (){
                // Keep batching until the batch returns fewer
                // than BATCH_SIZE results.
                if (intermediateResults.length < BATCH_SIZE) {
                  return true;
                }
                else return false;
              }, function afterwards(err) {
                return next_subop(err);
              });
              // TODO:
              // pull all that(^^) into a convenience accessor on the Model prototype
              // e.g.
              // var otherModel = srcModel.associated(attrName);
              // var theIdentity = otherModel.identity

            }
            else {
              // wtf?
              return next_subop(new WLUsageError('Unrecognized association syntax'));
            }


            /**
             *
             */

            /**
             * This function will execute `runOperation()` recursively,
             * but it does some work first.
             *
             * @param  {[type]} subop              [description]
             * @param  {[type]} doRecursiveStep_cb [description]
             */
            function doRecursiveStep (subop, doRecursiveStep_cb) {

              // Now run the suboperation.
              runOperation(subop, function (err, results) {
                if (err) return doRecursiveStep_cb(err);

                // console.log('results', results);

                // If the child operation returned results, use them
                // to enforce a nested WHERE clause (ie. subquery) in-memory.
                // (diff them with the stuff already in the cache and
                // remove extra entries)
                if (results.length) {
                  var subquery = subqueries[attrName];
                  // console.log('OK, isthere a subq?', subquery);
                  // console.log('SUBresults:',results);
                  if (_.isObject(subquery) && Object.keys(subquery).length) {

                    var originalResultIds = _.pluck(results,assoc.primaryKey);
                    // console.log('originalResultIds:', originalResultIds);

                    // Use WLFilter to calculate which of the sub-results
                    // from this batch should be allowed to remain in the cache.
                    // console.log('WLFilter ',results,'on ',subquery);
                    var filteredResults = WLFilter(results, {where: subquery}).results;
                    var filteredResultIds = _.pluck(filteredResults, assoc.primaryKey);
                    // console.log('the filtered results:', filteredResults);
                    // console.log('filteredResultIds:', filteredResultIds);

                    // Calculate the set of primary key values to omit
                    // from the parent results, then remove them from
                    // the QueryCache.
                    var removeCriteria = _.difference(
                      originalResultIds,
                      filteredResultIds
                    );
                    // console.log('removeCriteria:', removeCriteria);
                    // console.log('subop.from', subop.from);
                    cache.remove(subop.from, removeCriteria);
                  }

                }

                // Continue
                doRecursiveStep_cb();
              });
            }

          }, function (err) {

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

      // Run a final IN query (using the ids and sort indices stored in QC)
      // to expand the cache to include the complete result set.
      // TODO: explore pulling this "expand" logic into QC itself
      var inCriteria = {
        from: modelIdentity,
        where: {}
      };
      // Build SELECT clause
      inCriteria.select = operation.select;

      // Build WHERE clause
      inCriteria.where[primaryKey] = _.pluck(cache.get(modelIdentity), primaryKey);

      srcModel.find(inCriteria)
      .options({raw: true})
      .exec(function (err, results) {
        if (err) return cb(err);

        // Replace cached ids w/ the complete result set.
        cache.wipe(modelIdentity);
        cache.push(modelIdentity, results);

        // We're done, the cache is ready.
        // On to the integrator, but pass along the `results`
        // in case any records need to be removed from a parent
        // operation.
        cb(null, results);

      });
    });
  }
};



