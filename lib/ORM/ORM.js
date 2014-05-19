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

var WLEntity = require('../../util/WLEntity');
var DEFAULT_LOG = require('../../util/logger');


/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Models, Databases, and Adapters called the "ontology".
 * Most applications will only instantiate one ORM, and usually we
 * will use the `Waterline()` factory, since it takes care of a few other
 * steps for us as well.
 *
 * Note that some of these methods mutate the ORM's ontology
 * (again, the in-memory representation of its the adapters,
 * databases, and models.)  The ORM's public API should work at
 * any time-- including runtime.  Models can be added and removed
 * on the fly, as well as databases, as well as adapters.
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

    // `compatibilityMode` should be enabled when this ORM instance
    // is being used with legacy adapters (Waterline v0.x).
    compatibilityMode: false,

    // Switchback support is enabled by default
    Switchback: typeof opts.Switchback !== 'undefined' ? opts.Switchback : require('node-switchback'),

    // Triggered when an error is emitted on the ORM itself
    // because it cannot be passed to a callback of the
    // method that caused it (e.g. a usage error about an
    // omitted callback.)
    onError: function (err) {
      if (typeof err !== 'object' || !err instanceof WLError) {
        err = new WLError(err);
      }
      throw err;
    },

    // Triggered when a non-fatal warning is emited on the ORM itself.
    onWarn: DEFAULT_LOG.warn

  });

  // Be tolerant of entities defined of objects
  // (marshal them to arrays)
  opts.models = WLEntity.toArray(opts.models);
  opts.databases = WLEntity.toArray(opts.databases);
  opts.adapters = WLEntity.toArray(opts.adapters);

  // Now identify all of the models, databases, and adapters
  // into our ORM's ontology.  __Actually calling__ these methods
  // is important to centralize the logic in their definitions.
  // For instance, the `ORM.prototype.identify*` methods provide
  // `this.orm` to all instances in our ontology.
  // Nothing else in the Waterline code base does this- it must happen here!
  _.each(opts.models, function (model) { this.identifyModel(model); }, this);
  _.each(opts.databases, function (database) { this.identifyDatabase(database); }, this);
  _.each(opts.adapters, function (adapter) { this.identifyAdapter(adapter); }, this);

  // Merge remaining options directly into the Query instance
  _.defaults(this, opts);

  // Listen for error events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('error', opts.onError);

  // Listen for warning events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('warn', opts.onWarn);

}

// ORM extends Node's EventEmitter
util.inherits(ORM, EventEmitter);


/**
 * Static qualifier method
 * @param  {ORM?}  obj
 * @return {Boolean}
 */
ORM.isORM = function isORM(obj) {
  return typeof obj === 'object' && obj instanceof ORM;
};

// Public methods
ORM.prototype.transaction = require('./transaction');

// Normalize / validate the ontology.
// Check database configuration, validate model schemas, etc.
ORM.prototype.refresh = require('./refresh');

// Migrate the physical collections in the ORM's databases
// to make them match the current ontology.
ORM.prototype.migrate = require('./migrate');

// Generate a Query
ORM.prototype.query = require('./query');

// Identifiers
ORM.prototype.identifyModel = WLEntity.identifier('models', Model);
ORM.prototype.identifyDatabase = WLEntity.identifier('databases', Database);
ORM.prototype.identifyAdapter = WLEntity.identifier('adapters', Adapter);

// Forgetters
ORM.prototype.forgetModel = WLEntity.forgetter('models');
ORM.prototype.forgetDatabase = WLEntity.forgetter('databases');
ORM.prototype.forgetAdapter = WLEntity.forgetter('adapters');

// Getters
ORM.prototype.getModel = WLEntity.getter('models');
ORM.prototype.getDatabase = WLEntity.getter('databases');
ORM.prototype.getAdapter = WLEntity.getter('adapters');


// Convenience methods
ORM.prototype.bootstrap = function (objWithAnArrayOfRecordsForEachModel, cb){
  cb(new Error('Not implemented yet!'));
};
// Overloaded getter/identifier usage:
ORM.prototype.model = function () {
  if (arguments[1]) return WLEntity.identifier('models', Model).apply(this, Array.prototype.slice.call(arguments));
  else return WLEntity.getter('models').apply(this, Array.prototype.slice.call(arguments));
};
ORM.prototype.database = function () {
  if (arguments[1]) return WLEntity.identifier('databases', Database).apply(this, Array.prototype.slice.call(arguments));
  else return WLEntity.getter('databases').apply(this, Array.prototype.slice.call(arguments));
};
ORM.prototype.adapter = function () {
  if (arguments[1]) return WLEntity.identifier('adapters', Adapter).apply(this, Array.prototype.slice.call(arguments));
  else return WLEntity.getter('adapters').apply(this, Array.prototype.slice.call(arguments));
};

// Presentation
ORM.prototype.inspect = require('./inspect');

module.exports = ORM;
