/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var Adapter = require('../Adapter');
var Datastore = require('../Datastore');
var Junction = require('../Relation/Junction');
var Model = require('../Relation/Model');

// TODO: extrapolate and publish standalone modules..?
var WLEntity = require('root-require')('standalone/WLEntity');
var DEFAULT_LOG = require('root-require')('standalone/logger');
var WLError = require('root-require')('standalone/WLError');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var prettyInstance = require('root-require')('standalone/pretty-instance');


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

  // Built-in rules for joining, subquerying, migrating, adding, removing,
  // overriding, and identifying / garbage collecting relations attached
  // to associations.
  this.associationRules = [];

  // TODO: (eventually) cross-adapter commit log for transactions
  // this.commitLog = new Relation(...);

  // TODO: (eventually) cache for streaming map/reduce and, more
  // generally, overflowing footprints from QueryHeaps
  // this.heapCache = new Relation(...);


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
  _(opts.models)    .each(function(entity){ orm.identifyModel(entity); });
  _(opts.junctions) .each(function(entity){ orm.identifyJunction(entity); });
  _(opts.datastores).each(function(entity){ orm.identifyDatastore(entity); });
  _(opts.adapters)  .each(function(entity){ orm.identifyAdapter(entity); });


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

// Semantics
ORM.prototype.query = require('./semantics/query');
ORM.prototype.bootstrap = require('./semantics/bootstrap');
ORM.prototype.transaction = require('./semantics/transaction');
ORM.prototype.refresh = require('./semantics/refresh');
ORM.prototype.migrate = require('./semantics/migrate');

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

// Getters for built-in association rule (AR) definitions
// (e.g. `has-fk`, `has-fkarray`, `via-junction`, etc.)
ORM.prototype.getDefaultAR = function (key) {
  // Case-insensitive
  switch (key.toLowerCase()) {
    // embedsObject : require('./Relation/builtin-association-rules/embeds-object'),
    // embedsArray  : require('./Relation/builtin-association-rules/embeds-array'),
    case 'hasfk'        : return require('../Relation/builtin-association-rules/has-fk');
    case 'hasfkarray'   : return require('../Relation/builtin-association-rules/has-fkarray');
    case 'viafk'        : return require('../Relation/builtin-association-rules/via-fk');
    case 'viafkarray'   : return require('../Relation/builtin-association-rules/via-fkarray');
    case 'viajunction'  : return require('../Relation/builtin-association-rules/via-junction');
    default:
      throw new WLUsageError('Unknown association rule type: "'+key+'"');
  }
};


/**
 * #ORM.prototype.inspect()
 *
 * Presentation
 *
 * @return {String} that will be used when displaying
 *                  an ORM instance in `util.inspect`,
 *                  `console.log`, etc.
 */

ORM.prototype.inspect = function inspect () {
  return prettyInstance(this, util.format(
    ' • %d model(s)\n'+
    ' • %d datastore(s)\n'+
    ' • %d adapter(s)',
    this.models.length,
    this.datastores.length,
    this.adapters.length
  ));
};


module.exports = ORM;
