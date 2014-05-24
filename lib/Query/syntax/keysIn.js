/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * Configure a case-insensitive check function which will, given
 * an object with string keys, return true for those keys which are
 * recognized `synonyms`.
 *
 * @params {Object} synonyms, ...
 * @return {Function}
 */

module.exports = function keysIn (/*synonyms, moreSynonyms, evenMoreSynonyms, etc. */) {

  var synonyms = _.reduce(Array.prototype.slice.call(arguments), function (allSynonyms, someSynonyms) {
    _.extend(allSynonyms, someSynonyms);
    return allSynonyms;
  }, {});

  var MAX_DEPTH = 50;

  /**
   * Iterator fn for lodash array cursor.
   *
   * @param {String} item
   * @return {Boolean}
   */
  return function _doesMatchTheseSynonyms (val, item) {

    // Resolve synonym(s) and fold case
    var cursor = item;
    var depth = 0;
    // console.log(util.format('_doesitem(%s)MatchTheseSynonyms(%s):',item, util.inspect(synonyms, false, null)));
    while (depth<MAX_DEPTH && typeof cursor === 'string') {
      // console.log('checked synonyms for cursor:',cursor);
      depth++;
      cursor = synonyms[cursor];
    }
    return cursor === true;
  };
};
