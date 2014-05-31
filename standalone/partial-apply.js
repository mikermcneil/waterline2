/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * partialApply()
 *
 * Like `_.partial(fn, arg0, arg1, ..., argN)`,
 * but for a dynamic array of arguments:
 *
 * @param {Function} fn
 * @param {Array}    args
 * @return {Function}
 */

module.exports = function partialApply(fn, args) {
  return _.partial.apply(null, [fn].concat(args));
};

