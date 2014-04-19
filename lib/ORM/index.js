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


// Ontology definition/modification
// These functions should work at any time-- including runtime.
// TODO: pull them out into separate files

ORM.prototype.identifyModel = function (identity, definition) {
  definition = _normalizeDefinition(identity, definition);
  definition.orm = this;
  var model = new Model(definition);

  this.models.push(model);
  this.refresh();
  return this;
};

ORM.prototype.identifyDatabase = function (identity, definition) {
  definition = _normalizeDefinition(identity, definition);
  definition.orm = this;
  var database = new Database(definition);


  /// TODO: make this stuff unnecessary by doing what we did w/ Model ////
  Object.defineProperty(database, 'orm', {
      enumerable: false,
      writable: true
  });
  database.orm = this;
  /////////////////////////////////////////////////////////////////////////

  this.databases.push(database);
  this.refresh();
  return this;
};

ORM.prototype.identifyAdapter = function (identity, definition) {
  definition = _normalizeDefinition(identity, definition);
  definition.orm = this;
  var adapter = new Adapter(definition);

  /// TODO: make this stuff unnecessary by doing what we did w/ Model ////
  Object.defineProperty(adapter, 'orm', {
      enumerable: false,
      writable: true
  });
  adapter.orm = this;
  /////////////////////////////////////////////////////////////////////////

  this.adapters.push(adapter);
  this.refresh();
  return this;
};


ORM.prototype.forgetModel = function (identity) {
  _.remove(this.models, { identity: identity });
  return this;
};

ORM.prototype.forgetAdapter = function (identity) {
  _.remove(this.adapters, { identity: identity });
  return this;
};

ORM.prototype.forgetDatabase = function (identity) {
  _.remove(this.databases, { identity: identity });
  return this;
};


// Getters
ORM.prototype.model = function (identity) {
  return _(this.models).find({identity: identity});
};
ORM.prototype.database = function (identity) {
  return _(this.databases).find({identity: identity});
};
ORM.prototype.adapter = function (identity) {
  return _(this.adapters).find({identity: identity});
};



// Presentation

/**
 * Display a formatted version of the specified instance.
 * Used by other classes in Waterline.
 *
 * @param  {[type]} instance  [description]
 * @param  {[type]} toDisplay [description]
 * @return {[type]}           [description]
 */
ORM.prototype.prettyInstance = function (instance, toDisplay) {
  var ticks = function (n) {
    r='';
    for (var i=0;i<n;i++) {
      r+='-';
    }
    return r;
  };

  toDisplay = (toDisplay || instance);
  if (typeof toDisplay !== 'string') {
    toDisplay = util.inspect(toDisplay, false, null);
  }

  var label = '['+instance.constructor.name+']';
  return util.format(
    '%s%s%s\n'+
    '%s\n'+
    '%s%s%s',
    ticks(6), label, ticks(6),
    toDisplay,
    ticks(6), ticks(label.length), ticks(6)
  );
};

ORM.prototype.inspect = function () {
  return this.prettyInstance(this, util.format(
    ' • %d model(s)\n'+
    ' • %d database(s)\n'+
    ' • %d adapter(s)',
    this.models.length,
    this.databases.length,
    this.adapters.length
  ));
};


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


module.exports = ORM;
