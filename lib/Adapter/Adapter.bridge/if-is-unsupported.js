/**
 * Module dependencies
 */

var util = require('util');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');



/**
 * Check that the adapter supports the requested functionality:
 * @param  {[type]}   method  [description]
 * @param  {[type]}   adapter [description]
 * @return {Boolean}           [description]
 * @api private
 */
module.exports = function _ifIsUnsupportedByAdapter(method, adapter) {
  var err;
  if (!adapter[method]) {
    err = new WLUsageError({reason: util.format('The `%s()` method is not supported by this adapter (`%s`)', method, adapter.identity )});
    return err;
  }
  else return false;
};


