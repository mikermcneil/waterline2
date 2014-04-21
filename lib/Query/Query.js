/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred');
var QueryCache = require('./engine/QueryCache');
var prettyInstance = require('../../util/prettyInstance');



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

  // Default Query options
  opts = _.defaults(opts || {}, {

    // Build up the initial operations tree.
    operations: {
      select: {},
      where: {},
      limit: 30,
      skip: 0,
      sort: {}
    }
  });

  // Merge remaining options directly into the Query instance
  _.merge(this, opts);

  // Construct the query cache
  this.cache = new QueryCache({ orm: this.orm });

  // Advisory flag about whether this Query is being truly streamed
  // or not (streaming USAGE works either way.)
  this.streamable = true;

  // Save the original worker function
  // (this will be wrapped so that output from the adapter may be
  // intercepted and parsed, and all the different usages may be
  // supported)
  this.worker = _adapterWorker;

  // Call Deferred's constructor with an intercepted worker function
  // which intermediates between the Query and the Adapter.
  // (used by .exec(), .log(), and promises impl.)
  Query.super_.apply(this, [this, _.bind(this.run, this)]);

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
Query.prototype.run = require('./run');

/**
 * Default result parser
 * (can be overridden in Query opts)
 */
Query.prototype.parse = require('./parse');


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
