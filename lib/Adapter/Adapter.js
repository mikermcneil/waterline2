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
  _.merge(this, definition || {});
}

// Presentation
Adapter.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Adapter <'+this.identity+'>');
};

// Make `this.orm` non-enumerable
Object.defineProperty(Adapter.prototype, 'orm', { enumerable: false, writable: true });


module.exports = Adapter;
