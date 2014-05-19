// 'use strict';

/**
 * Module dependencies
 */

var _ = require('lodash');
var $$ = require('./CONSTANTS');



/**
 * "Flatten" suboperation modifiers in an operation object
 */
module.exports = function flattenOperation(operation) {
  var flattenedOp = _.reduce(operation, function (memo, subObj, key) {

    var hasSubAttributeModifier = _.isObject(subObj) && _.any(Object.keys(subObj), function (key){
      return _.contains($$.SUBATTR_MODS, key);
    });

    var isFlat = !_.isObject(subObj) || _.isArray(subObj) || hasSubAttributeModifier || _.isDate(subObj) || subObj instanceof Error;


    // console.log('isFlat?', key, subObj, '=>', isFlat);
    if (isFlat) {
      memo[key] = subObj;
    }
    return memo;
  }, {});
  // console.log('FLATTENED', operation,'into:',flattenedOp);
  return flattenedOp;
};


