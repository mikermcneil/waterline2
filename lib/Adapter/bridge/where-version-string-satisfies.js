/**
 * Module dependencies
 */

var semver = require('semver');


/**
 * Configure a function which returns true for keys which are
 * version string satisfying the passed-in requirement.
 *
 * @param  {String} versionStringToSatisfy
 * @return {Function}
 */
module.exports = function _whereVersionStringSatisifes(versionStringToSatisfy) {
  return function (val, key) {
    var thisVersionString = key;
    if (semver.satisfies(versionStringToSatisfy, thisVersionString)) {
      return val;
    }
  };
};
