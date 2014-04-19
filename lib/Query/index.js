/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var WLUsageError = require('../WLError/WLUsageError');
var Deferred = require('../Deferred')();
var QueryCache = require('./runner/QueryCache');
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
  this.cache = new QueryCache();

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

// Define custom properties on our prototype
require('./properties')(Query.prototype);

// Query inhertis from Deferred.
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
Query.prototype.run = require('./runner');

/**
 * Default result parser
 * (can be overridden in Query opts)
 */
Query.prototype.parse = require('./parse');


/**
 * Setter method which provides RAW access to Query options.
 *
 * .options(), as well as all of the query modifier methods,
 * are useful at any point in the Query lifecycle up until data
 * is flowing (i.e. `.stream()` has been called)
 *
 * @param  {Object} additionalOptions
 * @return {Query}
 */
Query.prototype.options = function (additionalOptions) {
  _.merge(this, additionalOptions);
  return this;
};



// Query modifiers

/**
 * [select description]
 * @param  {[type]} _input [description]
 * @return {[type]}        [description]
 */
Query.prototype.select = function (_input) {
  var select = {};
  if (_.isString(_input)) {
    select[_input] = true;
  }
  else if (_.isArray(_input)) {
    select = _.reduce(_input, function arrayToObj(memo, attrName) {
      memo[attrName] = true;
      return memo;
    }, {});
  }
  else if (_.isObject(_input)) {
    select = _input;
  }
  this.operations.select = _.merge(this.operations.select, select);

  return this;
};


Query.prototype.set = require('./set');

// TODO
Query.prototype.populate = function () {};
Query.prototype.where = function () {};
Query.prototype.limit = function () {};
Query.prototype.skip = function () {};
Query.prototype.sort = function () {};
Query.prototype.paginate = function () {};



module.exports = Query;
