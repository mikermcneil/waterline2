/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.partialApply = require('../../util/partialApply');
var EventEmitter = require('events').EventEmitter;
var NOOP = require('node-noop').noop;
var WLUsageError = require('../WLError/WLUsageError');


module.exports = function (config) {
  config = config || {
    Promise: require('bluebird')
  };


  /**
   * Construct a Deferred object.
   *
   * A Deferred is a basic flow control mechanism which is
   * used to extend the syntax of asynchronous methods to
   * support chaining (primarily for query modifiers.)
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
        var resultFn = _.partialApply(exec_cb, resultArgs);
        return resultFn();
      };

      // TODO: setTimeout + clearTimeout or warning about not
      // triggering the `exec_cb`.

      // Call the `deferred_callback` and pass it the function we defined above.
      // The definition of this function usually exists in a core method somewhere,
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


    // If Promise constructor was specified, instantiate Promise
    if (config.Promise) {

    //   // This has to be done factory-style, since in most Promise
    //   // impls, the constructor is "frozen" (at least this is true
    //   // for Q and Bluebird)  For more information, see:
    //   // https://github.com/promises-aplus/constructor-spec/issues/6#issuecomment-11618368
    //   var self = this;
    //   var executeDeferred = this.exec;
    //   var promise = new config.Promise(function (success, reject) {
    //     console.log('in promise');
    //     self.on('done', function () {
    //       executeDeferred(function (err, result) {
    //         console.log('exec() in promise');
    //         if (err) return reject(err);
    //         else return success(result);
    //       });
    //     });
    //   });
    //   promise = _.extend(promise, this);
    //   promise = _.bindAll(promise);

      // return promise;
    }


    //
    // Otherwise, promises will not be supported.
    // In this case, don't return a generated object,
    // just do the... thing.
    //


  }


  // If a Promise constructor was specified, Deferred
  // will extend from EventEmitter:
  if ( config.Promise ) {
    util.inherits(Deferred, EventEmitter);
  }


  return Deferred;

};

