/**
 * Module dependencies
 */

var Model = require('../../lib/Model');



/**
 * @param  {Model?}  model
 */
module.exports = function isModel(model) {
  return typeof model === 'object' &&
    model instanceof Model;
};
