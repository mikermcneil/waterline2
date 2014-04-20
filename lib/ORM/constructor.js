/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
_.defaults = require('merge-defaults');

var WLError = require('../WLError');
var Adapter = require('../Adapter');
var Database = require('../Database');
var Model = require('../Model');


/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Models, Databases, and Adapters called the "ontology".
 * Most applications will only instantiate one ORM, and usually we
 * will use the `Waterline()` factory, since it takes care of a few other
 * steps for us as well.
 *
 * @constructor
 * @param {Object} opts
 */

function ORM (opts) {
  // Ensure at least empty arrays exist in our ontology:
  this.adapters = [];
  this.databases = [];
  this.models = [];

  // Now marshal opts and use them to extend our ontology:
  opts = opts || {};
  _.defaults(opts, {

    // Triggered when an error is emitted on the ORM itself
    // because it cannot be passed to a callback of the
    // method that caused it (e.g. a usage error about an
    // omitted callback.)
    onError: function (err) {
      if (typeof err !== 'object' || !err instanceof WLError) {
        err = new WLError(err);
      }
      console.error(err);
    }
  });

  // Be tolerant of objects, but marshal them to arrays:
  opts.models = _defObj2defArray(opts.models);
  opts.databases = _defObj2defArray(opts.databases);
  opts.adapters = _defObj2defArray(opts.adapters);

  // Ensure everything in `opts` is new-ed up appropriately
  opts.models = _constructAll(opts.models, Model);
  opts.databases = _constructAll(opts.databases, Database);
  opts.adapters = _constructAll(opts.adapters, Adapter);

  // Now identify all of the models, databases, and adapters
  // into our ORM's ontology.  __Actually calling__ these methods
  // are important to centralize the logic in their definitions--
  // for instance, the `identify*` methods provide access to `this.orm`
  // to all instances in our ontology.  Nowhere else in Waterline does this!
  _.each(opts.models, function (model) { this.identifyModel(model); }, this);
  _.each(opts.databases, function (database) { this.identifyDatabase(database); }, this);
  _.each(opts.adapters, function (adapter) { this.identifyAdapter(adapter); }, this);

  // Listen for error events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('error', opts.onError);

}

// ORM extends Node's EventEmitter
util.inherits(ORM, EventEmitter);


// Public methods
ORM.prototype.transaction = require('./transaction');
ORM.prototype.refresh = require('./refresh');
ORM.prototype.migrate = require('./migrate');
ORM.prototype.query = require('./query');


// Ontology definition/modification/lookup
// These functions should work at any time-- including runtime.

// Identifiers
ORM.prototype.identifyModel = _buildIdentifier('models', Model);
ORM.prototype.identifyDatabase = _buildIdentifier('databases', Database);
ORM.prototype.identifyAdapter = _buildIdentifier('adapters', Adapter);

// Forgetters
ORM.prototype.forgetModel = _buildForgetter('models');
ORM.prototype.forgetDatabase = _buildForgetter('databases');
ORM.prototype.forgetAdapter = _buildForgetter('adapters');

// Getters
ORM.prototype.model = _buildGetter('models');
ORM.prototype.database = _buildGetter('databases');
ORM.prototype.adapter = _buildGetter('adapters');



// Presentation
ORM.prototype.inspect = require('./inspect');


////////////////////////////////////////////////////////




// Private methods:


/**
 * Serialize a single definition.
 * @return {Object}
 * @api private
 */
function _normalizeDefinition (identity, definition) {

  // `identity` argument is optional
  if (typeof identity === 'object') {
    definition = identity;
    identity = undefined;
  }

  // `definition` is optional, and should be an object
  definition = definition || {};

  // Apply `identity` argument to definition, if relevant
  if (identity) {
    identity = identity.toLowerCase();
    definition.identity = identity;
  }

  return definition;
}


/**
 * @param  {Array} array
 * @return {Object}
 * @api private
 */
function _defArray2defObj (array) {
  if (_.isPlainObject(array)) return array;
  if (!array) return {};

  return _.reduce(array, function (memo, item) {
    // Skip items w/o an identity
    if (!item.identity) return memo;
    memo[identity] = item.identity;
    return memo;
  }, {});
}

/**
 * @param  {Object} obj
 * @return {Array}
 * @api private
 */
function _defObj2defArray (obj) {
  if (_.isArray(obj)) return obj;
  if (!obj) return [];

  return _.reduce(obj, function (memo, item, key) {
    item.identity = item.identity || key;
    memo.push(item);
    return memo;
  }, []);
}

/**
 * "New up" a given array of definitions using the
 * given Class constructor.
 *
 * @param  {Array{Object?}} set
 * @param {Class.constructor} Class
 * @return {Array{Class}}
 * @api private
 */
function _constructAll(set, Class) {
  return _.map(set, function (item) {
    if ( item instanceof Class ) return item;
    else return new Class(item);
  });
}


/**
 * [_buildIdentifier description]
 * @param  {[type]} things [description]
 * @param  {[type]} Thing  [description]
 * @return {[type]}        [description]
 */
function _buildIdentifier (things, Thing) {
  /**
   * [description]
   * @param  {[type]} identity   [description]
   * @param  {[type]} definition [description]
   * @return {[type]}            [description]
   */
  return function (identity, definition) {
    definition = _normalizeDefinition(identity, definition);
    definition.orm = this;
    this[things].push(new Thing(definition));
    this.refresh();
    return this;
  };
}

/**
 * [_buildForgetter description]
 * @param  {[type]} things [description]
 * @return {[type]}        [description]
 */
function _buildForgetter (things) {

  /**
   * [description]
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function (identity) {
    _.remove(this[things], { identity: identity });
    return this;
  };
}

/**
 * [_buildGetter description]
 * @param  {[type]} things [description]
 * @return {[type]}        [description]
 */
function _buildGetter (things) {
  /**
   * [description]
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function (identity) {
    return _.find(this[things], { identity: identity });
  };
}


module.exports = ORM;
