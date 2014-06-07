/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var normalizeCriteria = require('./criteria/syntax/normalize');
var $$ = require('./criteria/syntax/MODIFIERS');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var Deferred = require('root-require')('standalone/Deferred');
var prettyInstance = require('root-require')('standalone/pretty-instance');
var keysIn = require('root-require')('standalone/keys-in');
var QueryHeap = require('root-require')('standalone/QueryHeap');




/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on one or more Datastores.
 *
 * A Query is often spawned from a Model or Junction, but this is not
 * necessarily required- for instance it might be spawned directly from
 * a Datastore. A Query can also be instantiated directly using this
 * constructor, as long as the appropriate options are passed in
 * (most importantly an `orm` instance or `_adapterWorker` function.)
 *
 * Base Query options (`opts`) are passed down by the caller (as
 * mentioned previously- this is usually either a Relation or Datastore.)
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
  // and `criteria` was NOT passed in, merge in any top-level criteria
  // modifiers:
  if (typeof opts.criteria === 'undefined') {
    opts.criteria = _.pick(opts, keysIn($$.CRITERIA_MODS, $$.WL1_AGGREGATION_MODS, $$.WL1_JOIN_MODS));
  }

  // Delete keys from opts that would inadvertently override query modifier methods
  // (e.g. "select", "where") when opts are merged into `this` later on
  _($$.CRITERIA_MODS).keys().each(function (key) {
    delete opts[key];
  });

  // Delete criteria modifiers with undefined values to avoid unexpected issues
  // in WL1 integration:
  opts.criteria = _.pick(opts.criteria, function (val) {
    return typeof val !== 'undefined';
  });

  // If an aggregation/groupby or otherwise "currently WL1-only" modifier is set
  // on this query, automatically mark the query as "raw"
  // (see note above for caveat about the future of this)
  if (_.any(opts.criteria, keysIn($$.WL1_AGGR_MODS))) {
    opts.raw = true;
  }

  // console.log('BEFORE',opts.criteria);

  // If this Query originated from a relation, access it in order to pass it down
  // into `normalizeCriteria`
  var targetRelation = (function _lookupRelation(){
    if (!opts.criteria.from || !opts.orm) return;
    else if (_.isString(opts.criteria.from)) {
      return opts.orm.model(opts.criteria.from);
    }
    else if (_.isObject(opts.criteria.from)) {
      switch (opts.criteria.from.entity) {
        case 'model': return opts.orm.model(opts.criteria.from.identity);
        case 'junction': return opts.orm.junction(opts.criteria.from.identity);
      }
    }
  })();

  // Pass in `criteriaMetadata` for tracking additional information about
  // the criteria to use below...
  var criteriaMetadata = {
    numSubqueries: 0,
    numJoins: 0
  };

  // Normalize the criteria syntax
  opts.criteria = normalizeCriteria(opts.criteria, targetRelation, criteriaMetadata);

  // Examine criteriaMetadata and set the appopriate metadata properties on `opts`
  // (will be merged into `this` momentarily)
  opts.numSubqueries = criteriaMetadata.numSubqueries||0;
  opts.numJoins = criteriaMetadata.numJoins||0;

  // If the criteria tree is shallow (no joins/subqueries), we can enable `raw`
  // to avoid running unnecessary extra adapter queries.
  // (this also has the nice side-effect of making a number of the WL1 tests pass)
  if ( opts.numSubqueries===0 && opts.numJoins===0 ) {
    opts.raw = true;
  }

  // console.log('AFTER',require('util').inspect(opts.criteria, false, null));
  // console.log('numSubqueries:',opts.numSubqueries,'numJoins:',opts.numJoins);


  // Merge remaining options directly into the Query instance,
  _.merge(this, opts);

  // Construct the query heap
  this.heap = new QueryHeap({
    orm: this.orm,
    from: this.from,
    limit: this.criteria.limit,
    skip: this.criteria.skip,
    sort: this.criteria.sort,
    justFootprints: false
  });

  // Expose `this.cache` as a synonym for `this.heap`
  // TODO: deprecate this once we're sure all references to `cache` are gone.
  this.cache = this.heap;

  // Determine whether streaming is possible given the
  // specifics of this query (`this.criteria`) and the ontology.
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

  // console.log('Built query w/ WHERE Clause:', require('util').inspect(this.criteria.where, false, null));

}


// Query inherits from Deferred.
util.inherits(Query, Deferred);


/**
 * For presentation purposes only- what this Query
 * looks like when it is logged to the console.
 * @return {String}
 */
Query.prototype.inspect = function () {
  return prettyInstance(this, this.criteria);
};


/**
 * Wrapper function for query runner.
 * @return {Query}
 */
Query.prototype.run = require('./run');

/**
 * Default result parser
 * (can be overridden in Query opts)
 */
Query.prototype.parseResults = require('./results/parse');


// Query modifiers
Query.prototype.options = require('./modifier-methods/options');
Query.prototype.select = require('./modifier-methods/select');
Query.prototype.set = require('./modifier-methods/set');
Query.prototype.populate = require('./modifier-methods/populate');
Query.prototype.where = require('./modifier-methods/where');
Query.prototype.limit = require('./modifier-methods/limit');
Query.prototype.skip = require('./modifier-methods/skip');
Query.prototype.sort = require('./modifier-methods/sort');
Query.prototype.paginate = require('./modifier-methods/paginate');


module.exports = Query;
