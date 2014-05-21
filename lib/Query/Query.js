/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred');
var QueryHeap = require('./engine/QueryHeap');
var prettyInstance = require('../../util/prettyInstance');
var normalizeCriteria = require('./syntax/normalizeCriteria');


/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on one or more Databases.
 *
 * A Query is often spawned from a Model, but this is not necessarily
 * required- for instance it might be spawned directly from a Database.
 * A Query can also be instantiated directly using this constructor,
 * as long as the appropriate options are passed.
 *
 * Base Query options (`opts`) are passed down by the caller (as
 * mentioned previously- this is usually either a Model or Database.)
 * However additional options may be set before running the query using
 * the `.options()` modifier or `options: {}` syntax in the criteria obj.
 *
 * @constructor
 * @extends {Deferred}
 *
 * @param {Object} opts
 * @param {Function} _adapterWorker
 */

function Query (opts, _adapterWorker) {
  opts = opts || {};

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });


  // If `where`, `limit`, etc. were passed in at the top level,
  // and `operations` were NOT passed in, merge the criteria modifiers
  // in as operations:
  if (typeof opts.operations === 'undefined') {
    opts.operations = {
      from: opts.from,
      select: opts.select,
      where: opts.where,
      limit: opts.limit,
      skip: opts.skip,
      sort: opts.sort,

      // For now, WL1 aggregation modifiers like `count` and `average` are set up
      // to be backwards compatible-- first class citizens of the operations syntax.
      // This may change in the future to allow more flexible usage w/ groupby/having,
      // as well as using aggregations/groupby/having in whose() and populate() queries,
      // etc.
      count: opts.count,
      sum: opts.sum,
      max: opts.max,
      min: opts.min,
      average: opts.average,
      groupBy: opts.groupBy,

      // For now, pass down `joins` to support WL1.
      // This may or may not be removed eventually in favor of joins always being calculated
      // internally (in Adapter.interpolate()).  This keeps the physical-layer schema out of
      // app code.
      joins: opts.joins
    };
  }

  // Delete keys from opts that would inadvertently override query modifier methods
  // (e.g. "select", "where") when opts are merged into `this` later on
  delete opts.from;
  delete opts.select; delete opts.where; delete opts.limit; delete opts.skip; delete opts.sort;
  delete opts.count; delete opts.sum; delete opts.max; delete opts.min; delete opts.average;
  delete opts.groupBy;
  delete opts.joins;

  // Delete operations modifiers with undefined values to avoid unexpected issues
  // in WL1 integration:
  opts.operations = _.reduce(opts.operations, function (memo, val, key) {
    if (typeof val !== 'undefined') {
      memo[key] = val;
    }
    return memo;
  }, {});

  // If an aggregation/groupby modifier is set on this query, automatically mark it
  // as "raw"
  // (see note above for caveat about the future of this)
  if (
    opts.operations.count ||
    opts.operations.sum ||
    opts.operations.max ||
    opts.operations.min ||
    opts.operations.average ||
    opts.operations.groupBy
  ) {
    opts.raw = true;
  }

  // console.log('BEFORE',opts.operations);


  // If this Query originated from a model, access it in order to pass it down
  // into `normalizeCriteria`
  var targetModel;
  if (opts.operations.from && opts.orm) {
    targetModel = opts.orm.model(opts.operations.from);
  }
  //
  // Pass in `flags` for tracking additional information about
  // the operations to use below...
  var flags = {
    numSubqueries: 0,
    numJoins: 0
  };
  //
  // Normalize the operations syntax
  opts.operations = normalizeCriteria(opts.operations, targetModel, flags);

  // Examine flags and set the appopriate metadata properties on `opts`
  // (will be merged into `this` momentarily)
  opts.numSubqueries = flags.numSubqueries||0;
  opts.numJoins = flags.numJoins||0;

  // If the operations tree is shallow (no joins/subqueries), we can enable `raw`
  // to avoid running unnecessary extra adapter queries.
  // (this also has the nice side-effect of making a number of the WL1 tests pass)
  if ( opts.numSubqueries===0 && opts.numJoins===0 ) {
    opts.raw = true;
  }

  // console.log('AFTER',opts.operations);


  // Default Query options
  opts = _.defaultsDeep(opts, {

    // Default values for the initial operations tree.
    operations: {
      select: {},
      where: {},
      limit: 30,
      skip: 0,
      sort: {}
    }
  });


  // Merge remaining options directly into the Query instance,
  _.merge(this, opts);

  // Construct the query heap
  this.heap = this.cache = new QueryHeap({
    orm: this.orm,
    limit: this.operations.limit,
    skip: this.operations.skip,
    sort: this.operations.sort,
    footprint: false // (footprint === whether to fetch only primary keys + sort vectors, then do a final, extra query for each model involved to get the rest of the attribute values)
  });

  // Determine whether streaming is possible given the
  // specifics of this query (`this.operations`) and the ontology.
  // (defaults to false)
  // ...
  this.streamable = false;
  // (TODO)

  // Advisory flag indicating whether this Query's results should be
  // buffered in memory.  Set depending on usage, but may also be
  // automatically set if size of result set exceeds the high water mark.
  // Streaming usage whether this flag is true or not- but if this flag
  // is set to `false`, instead of the buffered results, the stream instance
  // will be passed to the promise/callback.
  // (defaults to true)
  this.buffering = true;

  // Save the original worker function
  // (this will be wrapped so that output from the adapter may be
  // intercepted and parsed, and all the different usages may be
  // supported)
  this.worker = _adapterWorker;

  // Before calling the Deferred super constructor, make sure, if possible,
  // we've grabbed the Switchback factory from the ORM instance behind this
  // query and attached it to ourselves
  if (this.orm && this.orm.Switchback) {
    this.Switchback = this.orm.Switchback;
  }

  // Call Deferred's constructor with an intercepted worker function
  // which intermediates between the Query and the Adapter.
  // (used by .exec(), .log(), and promises impl.)
  Query.super_.apply(this, [this, _.bind(this.run, this)]);

  console.log('Built query w/ WHERE Clause:', this.operations.where);

}


// Query inherits from Deferred.
util.inherits(Query, Deferred);


/**
 * For presentation purposes only- what this Query
 * looks like when it is logged to the console.
 * @return {String}
 */
Query.prototype.inspect = function () {
  return prettyInstance(this, this.operations);
};


/**
 * Wrapper function for query runner.
 * @return {Query}
 */
Query.prototype.run = require('./engine/run');

/**
 * Default result parser
 * (can be overridden in Query opts)
 */
Query.prototype.parseResults = require('./engine/parseResults');


// Query modifiers
Query.prototype.options = require('./modifiers/options');
Query.prototype.select = require('./modifiers/select');
Query.prototype.set = require('./modifiers/set');
Query.prototype.populate = require('./modifiers/populate');
Query.prototype.where = require('./modifiers/where');
Query.prototype.limit = require('./modifiers/limit');
Query.prototype.skip = require('./modifiers/skip');
Query.prototype.sort = require('./modifiers/sort');
Query.prototype.paginate = require('./modifiers/paginate');


module.exports = Query;
