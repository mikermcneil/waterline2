/**
 * Module dependencies
 */

var _ = require('lodash');
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
  opts = opts || {};

  // Be tolerant of objects, but marshal them to arrays:
  opts.models = _defObj2defArray(opts.models);
  opts.databases = _defObj2defArray(opts.databases);
  opts.adapters = _defObj2defArray(opts.adapters);

  // Ensure at least empty arrays exist in our ontology:
  this.adapters = opts.adapters || [];
  this.databases = opts.databases || [];
  this.models = opts.models || [];
}

ORM.prototype.transaction = require('./transaction');
ORM.prototype.refresh = require('./refresh');
ORM.prototype.migrate = require('./migrate');



// Ontology definition/modification
// These functions should work at any time-- including runtime.
// TODO: pull them out into separate files

ORM.prototype.identifyModel = function (identity, definition) {
  definition = _serializeDefinition(identity, definition);
  this.models.push(new Model(definition));
  this.refresh();
  return this;
};
ORM.prototype.identifyDatabase = function (identity, definition) {
  definition = _serializeDefinition(identity, definition);
  this.databases.push(new Database(definition));
  this.refresh();
  return this;
};
ORM.prototype.identifyAdapter = function (identity, definition) {
  definition = _serializeDefinition(identity, definition);
  this.adapters.push(new Adapter(definition));
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


////////////////////////////////////////////////////////



// Private methods:


/**
 * Serialize a single definition.
 * @return {Object}
 * @api private
 */
function _serializeDefinition (identity, definition) {

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


function _defArray2defObj (array) {
  if (_.isPlainObject(obj)) return obj;

  return _.reduce(array, function (memo, item) {
    // Skip items w/o an identity
    if (!item.identity) return memo;
    memo[identity] = item.identity;
    return memo;
  }, []);
}
function _defObj2defArray (obj) {
  if (_.isArray(obj)) return obj;

  return _.reduce(obj, function (memo, item, key) {
    item.identity = item.identity || key;
    memo.push(item);
    return memo;
  }, []);
}

module.exports = ORM;
