/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var WLError = require('root-require')('standalone/WLError');


/**
 * Construct a WLAdapterVersionError.
 *
 * @required {Adapter} properties.adapter
 * @required {Array} properties.adapterUsage
 */

function WLAdapterVersionError(properties) {

  // Set `reason`
  this.reason = util.format(
    'The adapter (`%s`) implements `apiVersion` "%s"'+
    '\n'+
    'But to use the `%s()` method, the adapter\'s `apiVersion` must match one of the following known semver strings:'+
    '\n'+
    _.reduce(adapterUsage, function (memo, adapterArgs, versionString) {return memo+'• '+versionString+'\n';}, '') +
    '\n'+
    '(tip: the `apiVersion` for an adapter is always "0.0.0" unless otherwise specified)',
    adapter.identity, adapter.apiVersion, method
  );

  // Call superclass
  WLAdapterVersionError.super_.call(this, properties);
}

util.inherits(WLAdapterVersionError, WLError);



// Default properties
WLAdapterVersionError.prototype.code =
'E_ADAPTER';
WLAdapterVersionError.prototype.reason =
'Encountered an error with one of your configured adapters';
WLAdapterVersionError.prototype.details =
'';

module.exports = WLAdapterVersionError;
