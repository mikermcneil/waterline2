/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * "Flatten" the values in an object by keeping primitives
 * and omitting any nested objects, excluding:
 *  -> arrays
 *  -> dates
 *  -> errors
 *
 * @param  {Object} tree
 * @return {Object}
 * @api private
 */
module.exports = function flattenValues (tree) {
  return _.reduce(tree, function (memo, subObj, key) {
    if (!_.isObject(subObj) || _.isArray(subObj) || _.isDate(subObj) || subObj instanceof Error) {
      memo[key] = subObj;
    }
    return memo;
  }, {});
};

