/**
 * Module dependencies
 */

var Adapter = require('../../lib/Adapter');



/**
 * @param  {Adapter?}  Adapter
 */
module.exports = function isAdapter(adapter) {
  return typeof adapter === 'object' &&
    adapter instanceof Adapter;
};
