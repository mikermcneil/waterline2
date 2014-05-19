// 'use strict';

/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * "Flatten" suboperation modifiers in an operation object
 */
module.exports = function flattenOperation(operation) {
  var flattenedOp = _.reduce(operation, function (memo, subObj, key) {

    var hasSubAttributeModifier = _.isObject(subObj) && _.any(Object.keys(subObj), function (key){
      return _.contains(SUBATTR_MODS, key);
    });

    var isFlat = !_.isObject(subObj) || _.isArray(subObj) || hasSubAttributeModifier || _.isDate(subObj);


    // console.log('isFlat?', key, subObj, '=>', isFlat);
    if (isFlat) {
      memo[key] = subObj;
    }
    return memo;
  }, {});
  // console.log('FLATTENED', operation,'into:',flattenedOp);
  return flattenedOp;
};




// Operation clause flags:
var OPERATION_MODS = ['where','select','sort','from','skip','limit'];

// Predicate modifiers
var PREDICATE_MODS = ['or'];

// Subquery modifiers
var SUBQUERY_MODS = ['whose', 'min', 'max'];

// Sub-attribute modifiers
var SUBATTR_MODS = [
  'contains', 'startsWith', 'endsWith',
  'in',
  'lessThan', 'greaterThan', 'equals', 'not', '!', '!=', '>', '<', '>=', '<='
];



//
// Currently unused:
//

/**
 * "Flatten" values in an object by keeping primitives and
 * omitting any nested objects, excluding:
 *  -> arrays
 *  -> dates
 *  -> errors
 *  -> subAttribute modifiers
 *
 * @param  {Object} tree
 * @return {Object}
 * @api private
 */
// function _flattenValues (tree) {
//   return _.reduce(tree, function (memo, subObj, key) {
//     var hasSubAttributeModifier = _.isObject(subObj) && _.any(Object.keys(subObj), function (key){
//       return _.contains(SUBATTR_MODS, key);
//     });
//     if (!_.isObject(subObj) || _.isArray(subObj) || _.isDate(subObj) || subObj instanceof Error || hasSubAttributeModifier) {
//       memo[key] = subObj;
//     }
//     return memo;
//   }, {});
// }


