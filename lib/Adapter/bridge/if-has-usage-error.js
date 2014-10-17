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
 * @optional {Relation} opts.relation
 * @required {Datastore} opts.datastore
 *
 * @return {WLUsageError} [or `null` if everything is cool]
 */

module.exports = function _ifHasUsageError(opts) {

  // console.log('validating runtimeargs',opts.runtimeArgs,'against usage',opts.usage);

  var invalidUsage = _.reduce(opts.usage, function(invalid, def, i) {
    var isCorrectType = (function typeChecker(actualValue, expectedType){
      if ((typeof actualValue) === expectedType) {
        return true;
      }
      if (expectedType === 'function' && _.isFunction(actualValue)) {
        return true;
      }
      if (expectedType === 'array' && _.isArray(actualValue)) {
        return true;
      }
      return false;
    })(opts.runtimeArgs[i], opts.usage[i].type);
    var isOptional = !!(opts.runtimeArgs[i] === undefined && (opts.usage[i].optional||opts.usage[i].defaultsTo));
    var hasDefault = !!(opts.usage[i].defaultsTo);

    // console.log('   •',def.label,': isOptional?',isOptional, 'hasDefault?', hasDefault);

    // If runtime arg is an unexpected type, and the arg is not optional, this is an error
    if (!isCorrectType && !isOptional) {
      return opts.usage[i];
    }
    // If runtime arg is invalid, but the arg is optional
    // AND no default value is specified, then this is an error.
    // (unless the usage is labeled 'callback', in which case it's ok)
    else if (!isCorrectType && isOptional && !hasDefault && opts.usage[i].label !== 'callback') {
      return opts.usage[i];
    }
    else return invalid;
  }, null);

  if (invalidUsage) {
    return new WLUsageError(util.format('Called `%s.%s()` with invalid usage for argument `%s`', (opts.relation||opts.datastore).identity, opts.method, invalidUsage.label));
  }
  else return null;
};
