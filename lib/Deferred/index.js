
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
 * @param {Function} callback
 *        the function triggered by `.exec()`
 */
function Deferred (opts, callback) {

  // `opts` is optional
  if (typeof opts === 'function' && !callback) {
    callback = opts;
    opts = {};
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
  this.exec = function (cb) {
    if (typeof cb !== 'function') cb = noop;
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

