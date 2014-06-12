/**
 * Module dependencies
 */

var keysIn = require('root-require')('standalone/keys-in');


/**
 * keysNotIn()
 *
 * Configure a case-insensitive check function which will, given
 * an object with string keys, return true for those keys which
 * are NOT recognized `synonyms`.
 *
 * @params {Object} synonyms, ...
 *
 * @return {Function}
 */

module.exports = function keysNotIn (/*synonyms, moreSynonyms, evenMoreSynonyms, etc. */) {
  return inverse(keysIn).apply(this,Array.prototype.slice.call(arguments));
};


/**
 * Invert the matched set from a qualifier function.
 *
 * @param  {Function} qualifierFn
 * @return {Function}
 * @api private
 */
function inverse (qualifierFn) {
  return function _invert () {
    return !qualifierFn.apply(this, Array.prototype.slice.call(arguments));
  };
}
