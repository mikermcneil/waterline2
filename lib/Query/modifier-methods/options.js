/**
 * Module dependencies
 */

var _ = require('lodash');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');



/**
 * Setter method which provides RAW access to Query options.
 *
 * .options(), as well as all of the query modifier methods,
 * are useful at any point in the Query lifecycle up until data
 * is flowing (i.e. `.stream()` has been called)
 *
 * @param  {Object} additionalOptions
 * @return {Query}
 */
module.exports = function __options__ (additionalOptions) {
  _.merge(this, additionalOptions);
  return this;
};
