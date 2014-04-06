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
 * and a set of Databases.  Most applications will only
 * instantiate one ORM.
 *
 * @constructor
 * @param {Object} opts
 */
function ORM (opts) {
  opts = opts || {};

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
  definition = _normalizeDefinition(identity, definition);
  this.models.push(new Model(definition));
  this.refresh();
  return this;
};
ORM.prototype.identifyDatabase = function (identity, definition) {
  definition = _normalizeDefinition(identity, definition);
  this.databases.push(new Database(definition));
  this.refresh();
  return this;
};
ORM.prototype.identifyAdapter = function (identity, definition) {
  definition = _normalizeDefinition(identity, definition);
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


/**
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

module.exports = ORM;
