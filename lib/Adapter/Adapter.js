/**
 * Module dependencies
 */

var _ = require('lodash');



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

  // Ensure `apiVersion` string exists-- if not, default to "0.0.0"
  this.apiVersion = this.apiVersion || '0.0.0';
}


// Return a context-dependent (i.e. "this"-dependent) bridge method using the provided spec
Adapter.interpolate = require('./interpolate');

// Qualifier
Adapter.isAdapter = require('root-require')('standalone/WLEntity').qualifier;

// Presentation
Adapter.prototype.inspect = function () {
  return require('root-require')('standalone/prettyInstance')(this, undefined, 'Adapter <'+this.identity+'>');
};


module.exports = Adapter;
