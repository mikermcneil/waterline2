/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * "Flatten" suboperation modifiers in an operation object
 */
module.exports = function flattenOperation(operation) {
  return _.reduce(operation, function (memo, subObj, key) {
    if (!_.isObject(subObj) || _.contains(['where','select','sort','from','skip','limit'],key)) {
      memo[key] = subObj;
    }
    return memo;
  }, {});
};



//
// Currently unused:
//

/**
 * "Flatten" values in an object by keeping primitives and
 * omitting any nested objects, excluding:
 *  -> arrays
 *  -> dates
 *  -> errors
 *
 * @param  {Object} tree
 * @return {Object}
 * @api private
 */
function _flattenValues (tree) {
  return _.reduce(tree, function (memo, subObj, key) {
    if (!_.isObject(subObj) || _.isArray(subObj) || _.isDate(subObj) || subObj instanceof Error) {
      memo[key] = subObj;
    }
    return memo;
  }, {});
}
