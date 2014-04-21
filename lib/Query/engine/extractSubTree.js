/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * Find suboperations in `targetKey` (e.g. "where") by looking
 * for nested objects.
 * (excludes sub-attribute modifiers and IN queries)
 *
 * @param  {Object} operation
 * @param  {String} targetKey
 * @return {Object}
 */
module.exports = function extractSubTree(operation, targetKey) {
  return _.reduce(operation[targetKey], function (memo, subop, attrName) {
    // Look for objects, but not arrays
    if (typeof subop === 'object' && !_.isArray(subop)) {

      // Make sure this is more than just a sub-attribute condition
      var subAttrModifiers = ['in', 'or', 'and', 'contains', 'startsWith', 'endsWith', 'like', '>', '<', '>=', '<=', '=', '!', '!=', '!==', ''];
      var hasSubAttrModifiers = _.any(subAttrModifiers, function (modifier) {
        return _.has(subop, modifier);
      });
      if ( !hasSubAttrModifiers ) {
        memo[attrName] = subop;
      }
    }

    return memo;
  }, {});
};
