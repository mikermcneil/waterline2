/**
 * Module dependencies
 */

var util = require('util');




/**
 * Display a formatted version of the specified instance.
 * Used by other classes in Waterline.
 *
 * @param  {[type]} instance  [description]
 * @param  {[type]} toDisplay [description]
 * @return {[type]}           [description]
 */
module.exports = function prettyInstance (instance, toDisplay) {
  var ticks = function (n) {
    r='';
    for (var i=0;i<n;i++) {
      r+='-';
    }
    return r;
  };

  toDisplay = (toDisplay || instance);
  if (typeof toDisplay !== 'string') {
    toDisplay = util.inspect(toDisplay, false, null);
  }

  var label = '['+instance.constructor.name+']';
  return util.format(
    '%s%s%s\n'+
    '%s\n'+
    '%s%s%s',
    ticks(6), label, ticks(6),
    toDisplay,
    ticks(6), ticks(label.length), ticks(6)
  );
};
