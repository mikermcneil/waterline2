/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
_.partialApply = require('../../util/partialApply');
var EventEmitter = require('events').EventEmitter;
var NOOP = require('node-noop').noop;
var WLUsageError = require('../WLError/WLUsageError');


module.exports = function (config) {


              //////////////////////////
              /////////////////////// //
              //////////////////// // //
              ///////////////// // // //
              ////////////// // // // //
              /////////// // // // // //
              //////// // // // // // //
              ///// // // // // // // //
              // // // // // // // // //
              // // // // // // // // //
              ///// // // // // // // //
              //////// // // // // // //
              /////////// // // // // //
              ////////////// // // // //
              ///////////////// // // //
              //////////////////// // //
              /////////////////////// //
              //////////////////////////

  // Important Note On Waterline.Deferred & Promises:
  //
  // The standard usage of Deferred is fundamentally different
  // than that of Promises.  Promises start executing immediately,
  // whereas a Waterline Deferred waits until `.exec()` is called.
  //
  // So how do we handle this?  If you pass in a `Promise` constructor
  // to Waterline, it puts Waterline Deferreds in "flowing" mode.
  // That is, they run immediately (well.. almost-- after one cycle of
  // the event loop, i.e. `setTimeout(...,0)`)


  // Configure Waterline Deferred constructor:
  config = config || {};
  _.defaults(config, {
    Promise: require('bluebird')
  });
  _.defaults(config, {
    flowingMode: config.Promise ? true : false
  });


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
   * @param {Function} worker
   *        the function triggered by `.exec()`
   */
  function Deferred (opts, worker) {

    // `opts` is optional
    if (typeof opts === 'function' && !worker) {
      worker = opts;
      opts = {};
    }

    // `worker` isn't.
    if (typeof worker !== 'function') {
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
      var self = this;

      // `exec_cb` is the last argument passed to `.exec()`
      var execArgs = Array.prototype.slice.call(arguments);
      var exec_cb = execArgs.pop();

      // `exec_cb` is optional
      if (typeof exec_cb !== 'function') exec_cb = NOOP;

      // The `worker` receives this function as its
      // first argument.
      var onDone = function onDone ( /* args sent back from worker */ ) {

        // Retrieve the results `worker` sent as args to its callback
        var workerResults = Array.prototype.slice.call(arguments);

        // If supported, emit the `done` event w/ args from "worker"
        if (self.emit) {
          self.emit.apply(null, ['done'].concat(workerResults));
        }

        // If the worker never triggers its own callback,
        // this `onDone` function is never called.
        // If it is called, we should clear the timeout for the
        // "never-triggered-exec_callback" warning.
        // TODO: clearTimeout

        // Call `exec_cb` with the results that were retrieved from `worker`
        var resultFn = _.partialApply(exec_cb, workerResults);
        return resultFn();
      };

      // TODO: setTimeout + clearTimeout or warning about not
      // triggering the `exec_cb`.

      // Call the `worker` and pass it the function we defined above.
      // The definition of this function usually exists in a core method somewhere,
      // and always expects one argument:  a callback.
      return worker(onDone);
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


    var promise;


    // If Promise constructor was specified, instantiate Promise.
    if (config.Promise) {

      // The Promise instance we augment must be manufactured, not extended.
      // That is, it is a "lookalike"-- not really an instance of Deferred.
      // This is because, in most Promise impls, the constructor is "frozen"
      // (at least this is true for Q and Bluebird)
      // For more information, see:
      // https://github.com/promises-aplus/constructor-spec/issues/6#issuecomment-11618368

      // Construct promise right away
      // (this Deferred will be flowing immediately)
      var resolver = config.Promise.defer();
      this.on('done', function fulfill (err, result) {
        // console.log('fulfilled promise (promise triggered exec())');
        if (err) return resolver.reject(err);
        else return resolver.resolve(result);
      });
      promise = resolver.promise;

      // Ensure that the manufactured object we're returning (`promise`)
      // looks and feels identical to a vanilla Deferred instance.
      _.extend(this, promise);
      _.bindAll(this);

      // Another way to do this using the Promise constructor
      // instead of Promise.deferred:
      //
      // var self = this;
      // var promise = new config.Promise(function (success, reject) {
      //   console.log('in promise');
      //   self.on('done', function () {
      //     executeDeferred(function (err, result) {
      //       console.log('exec() in promise');
      //       if (err) return reject(err);
      //       else return success(result);
      //     });
      //   });
      // });
    }


    // If Deferred is in `flowingMode`, run `.exec()` immediately.
    // (calling .exec() in user code again will have no additional effect)
    if (config.flowingMode) {
      this.exec();
    }


    // Return manufactured promise if it exists.
    if (promise) return promise;

  }


  // If a Promise constructor was specified, Deferred
  // will extend from EventEmitter:
  if ( config.Promise ) {
    util.inherits(Deferred, EventEmitter);
  }

  // Otherwise, it won't.  Why add extra weight
  // if it isn't helpful?  (may change mind on this
  // later if it ends up being useful)


  return Deferred;

};

