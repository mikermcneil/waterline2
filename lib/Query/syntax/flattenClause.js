// 'use strict';

/**
 * Module dependencies
 */

var _ = require('lodash');
var $$ = require('./CONSTANTS');



/**
 * Return a "flattened" WHERE or SELECT clause.
 *
 * (maintains referential transparency- returns a shallow clone)
 *
 * @param {Object} clause
 * @return {Object}
 */
module.exports = function flattenClause(clause) {
  var flattenedClause = _.reduce(clause, function (memo, subObj, attrName) {

    var hasSubAttributeModifier =
    _.isObject(subObj) &&
    _.any(Object.keys(subObj), function (attrName){
      return _.contains($$.SUBATTR_MODS, attrName);
    });

    var isFlat =
    !_.isObject(subObj) ||
    _.isArray(subObj) ||
    hasSubAttributeModifier ||
    _.isDate(subObj) ||
    subObj instanceof Error;

    // console.log('isFlat?', key, subObj, '=>', isFlat);
    if (isFlat) {
      memo[attrName] = subObj;
    }
    return memo;
  }, {});
  // console.log('FLATTENED', clause,'into:',flattenedClause);
  return flattenedClause;
};


