/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../../../util/prettyInstance');

/**
 * Construct a Query Cache.
 *
 * QueryCache instances are used for storing and emitting results
 * from the operation runner, back through the integrator, and
 * finally out of the parent Query as a RecordStream.
 *
 * @constructor
 * @extends {EventEmitter}
 */

function QueryCache () {
  this._models = {};
}
util.inherits(QueryCache, EventEmitter);

QueryCache.prototype.wipe = function (modelIdentity) {
  this._models[modelIdentity] = [];
  return this;
};

QueryCache.prototype.push = function (modelIdentity, results) {
  this._models[modelIdentity] = (this._models[modelIdentity] || []).concat(results);
  return this;
};

QueryCache.prototype.get = function (modelIdentity) {
  return this._models[modelIdentity] || [];
};

// For logging in Node:
QueryCache.prototype.inspect = function () {
  return prettyInstance(this, this._models);
};

module.exports = QueryCache;
