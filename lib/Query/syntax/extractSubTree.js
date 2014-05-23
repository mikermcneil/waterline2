/**
 * Module dependencies
 */

var _ = require('lodash');

// TODO: move this into the `syntax` submodule and use
// the thesauri in syntax/MODIFIERS.js instead of hard-coded
// values (this takes care of case-folding and synonyms for us.)


/**
 * Find subcriteria in `targetKey` (e.g. "where") by looking
 * for nested objects.
 * (excludes sub-attribute modifiers and IN queries)
 * TODO: and Dates and Errors
 *
 * @param  {Object} criteria
 * @param  {String} targetKey
 * @return {Object}
 */

module.exports = function extractSubTree(criteria, targetKey) {
  return _.reduce(criteria[targetKey], function (memo, subop, attrName) {
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
