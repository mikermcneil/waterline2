/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var async = require('async');
var WLFilter = require('waterline-criteria');
var WLError = require('../../WLError');
var WLUsageError = require('../../WLError/WLUsageError');


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

    // Define a `filterStack` to keep track of any records
    // that we find out need to be filtered out of the cache
    // for the model involved in this operation.
    // (we "find out" from child operations, i.e. subqueries)
    var filterStack = [];

    // For each batch of records:
    // (or, when possible, using a more optimized approach)
    var pageNo;
    var batchResults;
    async.doUntil(function doWhat (next) {

      // Increment the page number (or start off on page 0)
      pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

      // Build SELECT clause
      var select = {};
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

      // Find a batch of records' primary keys
      srcModel.find({
        select: select,
        from: modelIdentity,
        limit: BATCH_SIZE,
        skip: BATCH_SIZE * pageNo
      })
      .options({raw: true})
      .exec(function (err, _batchResults){
        if (err) return next(err);

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

        // Run "soft" (in-memory) WHERE filter on batch.
        // TODO: explore putting this WHERE filter on the QueryCache
        // instance as well.
        var remainingResults = WLFilter(batchResults, {
          where: operation.where
        }).results;
        // console.log('Query:',operation,'GOT RESULTS ('+operation.from+') :',remainingResults);


        // If the operation at the current cursor position has
        // one or more recursive WHERE clauses:
        var subqueries = extractSubTree(operation, 'where');
        if (Object.keys(subqueries).length) {

          // Perform a subquery using the remaining child records
          // (or use optimized approach, e.g. `.findWhose()`)
          // TODO:
          throw new Error('WHERE subqueries are not implemented yet.');
        }

        // Store remaining results in cache (or store only the ids and
        // values for the sort vector)
        cache.push(modelIdentity, remainingResults);


        /////////////////////////////////////////////////////////////////
        // Next, it's time to take care of joins.
        var joins = extractSubTree(operation, 'select');

        // If there are no joins, we're done.
        if ( !Object.keys(joins).length ) {
          return next();
        }

        // If the operation at the current cursor position has one
        // or more recursive SELECT clauses, (i.e. joins)
        // take the recursive step using the remaining child records
        // (or use optimized approach, i.e. call `.join()` in the adapter)
        else {
          // console.log('Skipping joins',joins);

          async.each(Object.keys(joins), function (attrName, next_subop) {
            var subselect = joins[attrName];

            // Lookup the "from" for this subop
            // and determine the association type
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
            if (attrDef.model) {
              associationType = _1_TO_N;

              _.merge(subop, subselect);

              subop.where[primaryKey] = _.pluck(remainingResults, attrName);

              // Now run the suboperation.
              runOperation(subop, function (err, filterStack) {
                if (err) return next_subop(err);

                // If the sub-operation returned a `filterStack`,
                // pop a set of primary key values to omit, then
                // remove them from the QueryCache.
                var toRemove = filterStack.pop();
                if (toRemove) {
                  //todo
                }

                // Continue
                next_subop(null, filterStack);

              });
              return;
            }
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

              // Now run the suboperation.
              runOperation(subop, next_subop);
              return;
            }
            else if (
              (attrDef.collection && !attrDef.via) ||
              (attrDef.collection && attrDef.via &&
              otherModel.attributes[attrDef.via] &&
              otherModel.attributes[attrDef.via].collection &&
              otherModel.attributes[attrDef.via].via === attrName)
            ) {
              associationType = _N_TO_M;

              // Determine Junction (i.e. join table) and its keys
              var assoc = srcModel.associations[attrName];
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

                  // Now run the suboperation.
                  runOperation(subop, next_junction_batch);
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

            }
            else {
              // wtf?
              return next_subop(new WLUsageError('Unrecognized association syntax'));
            }

            // TODO:
            // pull all that(^^) into a convenience accessor on the Model prototype
            // e.g.
            // var otherModel = srcModel.associated(attrName);
            // var theIdentity = otherModel.identity

          }, function (err) {
            next(err);
          });
          return;
        }
        //
        /////////////////////////////////////////////////////////////////

        // Get next batch of records and continue.
        next();

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

    function afterwards() {

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
        // On to the integrator, but pass along the filterStack
        // in case any records need to be removed from a parent
        // operation.
        cb(null, filterStack);

      });
    });
  }
};



/**
 * Find suboperations in `targetKey` (e.g. "where") by looking
 * for nested objects.
 * (excludes sub-attribute modifiers and IN queries)
 *
 * @param  {Object} operation
 * @param  {String} targetKey
 * @return {Object}
 */
function extractSubTree(operation, targetKey) {
  return _.reduce(operation[targetKey], function (memo, subop, attrName) {
    // Look for objects, but not arrays
    if (typeof subop === 'object' && !_.isArray(subop)) {

      // Make sure this is more than just a sub-attribute condition
      var subAttrModifiers = ['in', 'or', 'and', 'contains', 'startsWith', 'endsWith', 'like', '>', '<', '>=', '<=', '=', '!', '!=', '!==', ''];
      var hasSubAttrModifiers = _.any(subAttrModifiers, function (modifier) {
        return _.has(subop, modifier);
      });
      if ( !hasSubAttrModifiers ) {
        memo[attrName] = subop;
      }
    }

    return memo;
  }, {});
}
