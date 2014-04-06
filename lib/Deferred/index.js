/**
 * Module dependencies
 */

var NOOP = require('node-noop').noop;
var WLUsageError = require('../WLError/WLUsageError');
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
  this.exec = function ( /* args to .exec, ending in `exec_cb` */ ) {

    // `exec_cb` is the last argument passed to `.exec()`
    var execArgs = Array.prototype.slice.call(arguments);
    var exec_cb = execArgs.pop();

    // `exec_cb` is optional
    if (typeof exec_cb !== 'function') exec_cb = NOOP;

    // The `deferred_callback` receives this function as its
    // first argument.
    var afterwards = function afterwards ( /* args sent back from deferred_callback */ ) {

      // If the deferred_callback never triggers its own callback,
      // this `afterwards` function is never called.
      // If it is called, we should clear the timeout for the
      // "never-triggered-exec_callback" warning.
      // TODO: clearTimeout

      // Call `exec_cb` with the args that were retrieved from `deferred_callback`
      var resultArgs = Array.prototype.slice.call(arguments);
      return (_.partial(exec_cb, resultArgs))();
    };

    // TODO: setTimeout + clearTimeout or warning about not
    // triggering the `exec_cb`.

    // Call the `deferred_callback` and pass it the function we defined above.
    // The definition of this function usually exists in Waterline core somewhere,
    // and always expects one argument:  a callback.
    return deferred_callback(afterwards);
  };



  /**
   * Alternative to `.exec()`
   *
   * Calls `.exec()`, but pass in a log function as the callback.
   * Useful in the REPL.
   */
  this.log = function () {
    return this.exec(opts.logger);
  };
}




module.exports = Deferred;

