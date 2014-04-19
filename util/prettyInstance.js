/**
 * Module dependencies
 */

var util = require('util');




/**
 * Display a formatted version of the specified instance.
 * Used by other classes in Waterline.
 *
 * @param  {[type]} instance
 * @param  {[type]} toDisplay   (optional)
 * @param  {[type]} givenLabel  (optional)
 * @return {String}
 */
module.exports = function prettyInstance (instance, toDisplay, givenLabel) {
  var ticks = function (n) {
    r='';
    for (var i=0;i<n;i++) {
      r+='-';
    }
    return r;
  };

  if (toDisplay && typeof toDisplay !== 'string') {
    toDisplay = util.inspect(toDisplay, false, null);
  }
  else if (!toDisplay) {
    toDisplay = instance;
  }

  var label = '['+(givenLabel || instance.constructor.name)+']';
  return util.format(
    '%s%s%s\n'+
    '%s\n'+
    '%s%s%s',
    ticks(6), label, ticks(6),
    toDisplay,
    ticks(6), ticks(label.length), ticks(6)
  );
};
