/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * _ifHasUsageError()
 *
 * @required {Object} opts.usage
 * @required {Array}  opts.runtimeArgs
 * @required {String} opts.method
 *
 * @return {WLUsageError} [or `null` if everything is cool]
 */

module.exports = function _ifHasUsageError(opts) {

  var invalidUsage = _.reduce(opts.runtimeArgs, function(invalid, arg, i) {
    var isCorrectType = typeof opts.runtimeArgs[i] === opts.usage[i].type;
    var isOptional = opts.runtimeArgs[i] === undefined && opts.usage[i].optional;
    if (!isCorrectType && !isOptional) {
      return opts.usage[i];
    }
    else return invalid;
  }, null);

  if (invalidUsage) {
    return new WLUsageError(util.format('Invalid usage of `%s()`.  `%s` is invalid or missing', opts.method, invalidUsage.label));
  }
  else return null;
};
