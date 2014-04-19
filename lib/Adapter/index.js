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
  _.merge(this, definition);
};


module.exports = Adapter;
