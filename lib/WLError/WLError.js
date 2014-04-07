/**
 * Module dependencies
 */

var util = require('util')
  , http = require('http')
  , _ = require('lodash');



/**
 * WLError
 *
 * All errors passed to a query callback in Waterline extend
 * from this base error class.
 *
 * @param  {Object} properties
 * @constructor {WLError}
 */
function WLError( properties ) {

  if ( !_.isObject(properties) ) {
    properties = { reason: properties };
  }
  else if (!properties.code) {
    properties = { originalError: properties };
  }

  // Call super constructor (Error)
  WLError.super_.call(this);

  // Fold defined properties into the new WLError instance.
  properties = properties||{};
  _.extend(this, properties);

}
util.inherits(WLError, Error);


// Default properties
WLError.prototype.status =
500;
WLError.prototype.code =
'E_UNKNOWN';
WLError.prototype.reason =
'Encountered an unexpected error';


/**
 * `.message` and `.stack`
 *
 * Because some tools/apps (*cough* mocha) try to call `.message`
 * and/or `.stack()` on things that look like standard JavaScript
 * Errors, but really aren't.
 *
 * @return {String} the toString() output of this error
 */

WLError.prototype.__defineGetter__('message', function(){
  return this.toString();
});
WLError.prototype.__defineGetter__('stack', function() {
  return this.toString();
});

/**
 * Override JSON serialization.
 * (i.e. when this error is passed to `res.json()` or `JSON.stringify`)
 *
 * For example:
 * ```json
 * {
 *   status: 500,
 *   code: 'E_UNKNOWN'
 * }
 * ```
 *
 * @return {Object}
 */
WLError.prototype.toJSON =
WLError.prototype.toPOJO =
function () {
  var obj = {
    error: this.code,
    summary: this.reason,
    status: this.status,
    raw: this.explain()
  };

  // Only include `raw` if its truthy.
  if (!obj.raw) delete obj.raw;

  return obj;
};



/**
 * Override output for `sails.log[.*]`
 *
 * @return {String}
 *
 * For example:
 * ```sh
 * Waterline: ORM encountered an unexpected error:
 * { ValidationError: { name: [ [Object], [Object] ] } }
 * ```
 */
WLError.prototype.toLog = function () {
  return this.inspect();
};


/**
 * Override output for `util.inspect`
 * (also when this error is logged using `console.log`)
 *
 * @return {String}
 */
WLError.prototype.inspect = function () {
  return util.format('Error (%s)', this.code) + ' :: ' + /*this.toString() +*/ '\n'+util.inspect(this.toPOJO());
};


/**
 * @return {String}
 */
WLError.prototype.toString = function () {
  var output = '';
  var summary = this.summarize();
  var explanation = this.explain();

  output += summary;
  output += (summary && explanation) ? ':' : '.';
  if (explanation) {
    output +=  '\n' + explanation;
  }
  return output;
};



/**
 * @return {String}
 */
WLError.prototype.summarize = function () {
  var output = '';
  if (this.reason) {
    output += this.reason;
  }
  else {
    output += this.getCanonicalStatusMessage();
  }
  return output;
};


/**
 * @return {String} a detailed explanation of this error
 */
WLError.prototype.explain = function () {

  // Try to dress up the wrapped "original" error as much as possible.
  if (!this.originalError) {
    return '';
  }
  else if (typeof this.originalError === 'string') {
    return this.originalError;
  }
  // Run toString() on Errors
  else if ( util.isError(this.originalError) ) {
    return this.originalError.toString();
  }
  // But for other objects, use util.inspect()
  else {
    return util.inspect(this.originalError);
  }
};


/**
 * @return {String} description of this error's status code, as defined by HTTP.
 */
WLError.prototype.getCanonicalStatusMessage = function () {
  return http.STATUS_CODES[this.status];
};



module.exports = WLError;
