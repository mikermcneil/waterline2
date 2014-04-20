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

var _constructAll = require('../../util/constructAll');
var WLEntity = require('../../util/WLEntity');


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
 * (that is- the in-memory representation of its the adapters,
 * databases, and models.)  All public methods should work at
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
  opts.models = WLEntity.toArray(opts.models);
  opts.databases = WLEntity.toArray(opts.databases);
  opts.adapters = WLEntity.toArray(opts.adapters);

  // Ensure everything in `opts` is new-ed up appropriately
  opts.models = _constructAll(opts.models, Model);
  opts.databases = _constructAll(opts.databases, Database);
  opts.adapters = _constructAll(opts.adapters, Adapter);

  // Now identify all of the models, databases, and adapters
  // into our ORM's ontology.  __Actually calling__ these methods
  // is important to centralize the logic in their definitions.
  // For instance, the `ORM.prototype.identify*` methods provide
  // `this.orm` to all instances in our ontology.
  // Nothing else in the Waterline code base does this- it must happen here!
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
ORM.prototype.model = WLEntity.getter('models');
ORM.prototype.database = WLEntity.getter('databases');
ORM.prototype.adapter = WLEntity.getter('adapters');

// Presentation
ORM.prototype.inspect = require('./inspect');

module.exports = ORM;
