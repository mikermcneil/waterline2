/**
 * Module dependencies
 */

var NOOP = require('node-noop').noop;
var WLUsageError = require('../errors/WLUsageError');



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

    var afterwards = function afterwards () {
      // The `callback` specified to this Deferred
      // receives this function as its first argument.
      // If it never triggers it, this function is never called.

      exec_cb();
    };

    // TODO: setTimeout + clearTimeout or warning about not triggering
    // the callback

    return callback(afterwards);
  };



  /**
   * Call `.exec()`, but pass in a log function as the callback.
   * Useful in the REPL.
   */
  this.log = function () {
    this.exec(opts.logger);
  };
}




module.exports = Deferred;

