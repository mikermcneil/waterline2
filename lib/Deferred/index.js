/**
 * Module dependencies
 */

var NOOP = require('node-noop').noop;
var WLUsageError = require('../errors/WLUsageError');
var _ = require('lodash');


/**
 * Construct a Deferred object.
 *
 * A Deferred is a basic flow control mechanism which is
 * primarily used to extend Waterline syntax to support
 * the chaining of query modifiers.
 *
 * Each Deferred instance maintains its own options, which include
 * a reference to the promise library in use.
 *
 * @constructor
 * @param {Object} opts
 * @param {Function} deferred_callback
 *        the function triggered by `.exec()`
 */
function Deferred (opts, deferred_callback) {

  // `opts` is optional
  if (typeof opts === 'function' && !deferred_callback) {
    deferred_callback = opts;
    opts = {};
  }

  // `deferred_callback` isn't.
  if (typeof deferred_callback !== 'function') {
    throw new WLUsageError({ reason: 'Callback required in Deferred constructor' });
  }

  // A logger can be passed in as `opts.logger`
  opts = opts || {};
  _.defaults(opts, {
    logger: function defaultDeferredLogger (err, result) {
      if (err) return console.error(err);
      else return console.log(result);
    }
  });


  // TODO: extend Promise constructor, if specified
  // `opts.Promise`


  /**
   * Execute the callback of this deferred object.
   * This is the "trigger" that executes the deferred logic.
   * If promises are being used, they call this method.
   */
  this.exec = function (exec_cb) {

    // `exec_cb` is optional
    if (typeof exec_cb !== 'function') exec_cb = NOOP;

    // The `deferred_callback` receives this function as its
    // first argument.
    var afterwards = function afterwards () {
      // TODO: clearTimeout

      // If the deferred_callback never triggers its own callback,
      // this `afterwards` function is never called.
      var args = Array.prototype.slice.call(arguments);
      (_.partial(exec_cb, args))();
    };

    // TODO: setTimeout + clearTimeout or warning about not triggering
    // the callback

    return deferred_callback(exec_cb);
  };



  /**
   * Call `.exec()`, but pass in a log function as the callback.
   * Useful in the REPL.
   */
  this.log = function () {
    return this.exec(opts.logger);
  };
}




module.exports = Deferred;

