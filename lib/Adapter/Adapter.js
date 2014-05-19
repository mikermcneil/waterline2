/**
 * Module dependencies
 */

var _ = require('lodash');
var prettyInstance = require('../../util/prettyInstance');


/**
 * Consruct an Adapter.
 *
 * Mostly a noop, this takes an adapter definition object
 * and constructs an Adapter instance based on it.
 *
 * Currently, the new instance and the adapter definition object
 * are more or less exactly the same thing.
 *
 * @param  {Object} definition
 * @constructor
 */
function Adapter ( definition ) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  _.merge(this, definition || {});
}


/**
 * `Adapter.interpolate()`
 *
 * Build an accessor method using the provided `spec`.
 * Determines the ontology by relying on the context of the caller.
 *
 * TODO (maybe?): allow a specific adapter to be passed in as well
 *
 * @param {Object} spec
 * @return {Function}
 * @static
 */
Adapter.interpolate = require('./interpolate');

/**
 * `Adapter.isAdapter()`
 *
 * @param  {Adapter?}  obj
 * @return {Boolean}
 * @static
 */
Adapter.isAdapter = function isAdapter(obj) {
  return typeof obj === 'object' && obj instanceof Adapter;
};

// Presentation
Adapter.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Adapter <'+this.identity+'>');
};


module.exports = Adapter;
