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
 * Query Runner.
 *
 * The query runner traverses the given `operations` tree and runs
 * each one by deducing the appropriate adapter(s), database(s),
 * and method(s) from the given `orm` instance.
 *
 * The query runner generates a QueryCache.  As operations complete,
 * this function iteratively stores its results in the cache.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result RecordStream.
 *
 * @type {Function}
 * @param {Object} operationsTree
 * @param {Query} parentQuery
 */

module.exports = function _runner (operationsTree, parentQuery) {

  // Grab hold of the parentQuery's ORM, cache, and constructor
  var orm = parentQuery.orm;
  var cache = parentQuery._cache;
  var Query = parentQuery.constructor;

  // We don't have to worry about custom columnNames
  // and tableNames here, because we're using standard
  // Waterline query syntax to talk to the adapter,
  // which normalizes everything.
  // Additionally, the `keys` object in the operations
  // tree has already been normalized with the correct
  // primary key and/or foreign keys for each model.

  var onDone = function (err) {
    if (err) parentQuery.emit('runner_error', err);
    else {
      // We're done!  All the data necessary to build
      // the result set has been gathered.

      // Next, it's on to the integrator
      parentQuery.emit('runner_finished');
    }
  };

  // Run operations
  runOperation(operationsTree, onDone);

  return parentQuery;



  /**
   * Recursive, asynchronous function which runs the specified operation.
   *
   * @param  {Object} operation  - a branch of an ancestral operations tree, or the tree itself
   * @param  {Function} onDone   - callback
   */
  function runOperation (operation, onDone) {
    var DEFAULT_LIMIT = 30;
    var BATCH_SIZE = 100;

    var modelIdentity = operation.from;
    var primaryKey = 'id';

    // Use a mock adapter for now
    // TODO: actually call out to the adapter here instead using Adapter.wrap()
    var srcModel = orm.model(modelIdentity);

    if (!srcModel) {
      return onDone(new WLError(util.format('Unknown model: %s',modelIdentity)));
    }

    // For each batch of records:
    // (or, when possible, using a more optimized approach)
    var pageNo;
    var batchResults;
    async.doUntil(function doWhat (next) {

      // Increment the page number (or start off on page 0)
      pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

      // Find a batch of records
      srcModel.find({
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
          return onDone();
        }

        // If the operation at the current cursor position has one
        // or more recursive SELECT clauses, (i.e. joins)
        // take the recursive step using the remaining child records
        // (or use optimized approach, i.e. call `.join()` in the adapter)
        else {
          console.log('Skipping joins',joins);
          return onDone();
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
      inCriteria.where[primaryKey] = _.pluck(cache.get(modelIdentity), primaryKey);
      srcModel.find(inCriteria)
      .options({raw: true})
      .exec(function (err, results) {
        if (err) return onDone(err);

        // Replace cached ids w/ the complete result set.
        cache.wipe(modelIdentity);
        cache.push(modelIdentity, results);

        // We're done, the cache is ready.
        // On to the integrator.
        onDone();

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
