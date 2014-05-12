/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLError = require('./WLError');



/**
 * WLUsageError
 *
 * @extends WLError
 */
function WLUsageError (properties) {

  // Call superclass
  WLUsageError.super_.call(this, properties);
}
util.inherits(WLUsageError, WLError);


// Override WLError defaults with WLUsageError properties.
WLUsageError.prototype.code =
'E_USAGE';
WLUsageError.prototype.status =
0;
WLError.prototype.reason =
'Invalid usage';


module.exports = WLUsageError;
