/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var Adapter = require('../Adapter');
var Datastore = require('../Datastore');
var Junction = require('../Junction');
var Model = require('../Model');

// TODO: extrapolate and publish standalone modules..?
var WLEntity = require('root-require')('standalone/WLEntity');
var DEFAULT_LOG = require('root-require')('standalone/logger');
var WLError = require('root-require')('standalone/WLError');


/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Models, Datastores, and Adapters called the "ontology".
 * Most applications will only instantiate one ORM, and usually we
 * will use the `Waterline()` factory, since it takes care of a few other
 * steps for us as well.
 *
 * Note that some of these methods mutate the ORM's ontology
 * (again, the in-memory representation of its the adapters,
 * datastores, and models.)  The ORM's public API should work at
 * any time-- including runtime.  Models can be added and removed
 * on the fly, as well as datastores, as well as adapters.
 *
 * @constructor
 * @param {Object} opts
 */

function ORM (opts) {

  var orm = this;

  // Ensure at least empty arrays exist in our ontology:
  this.adapters = [];
  this.datastores = [];
  this.junctions = [];
  this.models = [];

  // Now marshal opts and use them to extend our ontology:
  opts = opts || {};
  _.defaultsDeep(opts, {

    // TODO:
    // Unless otherwise specified, hook up datastores to this adapter.
    // defaultAdapter: '_built-in-default-adapter',

    // TODO:
    // Unless otherwise specified, hook up models to this datastore.
    // defaultDatastore: '_built-in-default-datastore',

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
  opts.models     = WLEntity.toArray(opts.models);
  opts.junctions  = WLEntity.toArray(opts.junctions);
  opts.datastores = WLEntity.toArray(opts.datastores);
  opts.adapters   = WLEntity.toArray(opts.adapters);

  // Now identify all of the models, datastores, and adapters
  // into our ORM's ontology.  __Actually calling__ these methods
  // is important to centralize the logic in their definitions.
  // For instance, the `ORM.prototype.identify*` methods provide
  // `this.orm` to all instances in our ontology.
  // Nothing else in the Waterline code base does this- it must happen here!
  _(opts.models)    .each(this.identifyModel, this);
  _(opts.junctions) .each(this.identifyJunction, this);
  _(opts.datastores).each(this.identifyDatastore, this);
  _(opts.adapters)  .each(this.identifyAdapter, this);

  // Merge remaining options directly into the Query instance
  _.defaultsDeep(this, opts);

  // Listen for error events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('error', opts.onError);

  // Listen for warning events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('warn', opts.onWarn);

}

// ORM extends Node's EventEmitter
util.inherits(ORM, EventEmitter);

// Qualifier
ORM.isORM = WLEntity.qualifier;

// Inherent
ORM.prototype.query = require('./inherent/query');
ORM.prototype.bootstrap = require('./inherent/bootstrap');
ORM.prototype.transaction = require('./inherent/transaction');
ORM.prototype.refresh = require('./inherent/refresh');

// Identifiers
ORM.prototype.identifyModel = WLEntity.identifier('models', Model);
ORM.prototype.identifyJunction = WLEntity.identifier('junctions', Junction);
ORM.prototype.identifyDatastore = WLEntity.identifier('datastores', Datastore);
ORM.prototype.identifyAdapter = WLEntity.identifier('adapters', Adapter);

// Forgetters
ORM.prototype.forgetModel = WLEntity.forgetter('models');
ORM.prototype.forgetJunction = WLEntity.forgetter('junctions');
ORM.prototype.forgetDatastore = WLEntity.forgetter('datastores');
ORM.prototype.forgetAdapter = WLEntity.forgetter('adapters');

// Getters
ORM.prototype.getModel = WLEntity.getter('models');
ORM.prototype.getJunction = WLEntity.getter('junctions');
ORM.prototype.getDatastore = WLEntity.getter('datastores');
ORM.prototype.getAdapter = WLEntity.getter('adapters');

// Accessors
// (overloaded getter/identifier usage)
ORM.prototype.model = WLEntity.accessor('models', Model);
ORM.prototype.junction = WLEntity.accessor('junctions', Junction);
ORM.prototype.datastore = WLEntity.accessor('datastores', Datastore);
ORM.prototype.adapter = WLEntity.accessor('adapters', Adapter);

// Presentation
ORM.prototype.inspect = require('./inherent/inspect');

module.exports = ORM;
