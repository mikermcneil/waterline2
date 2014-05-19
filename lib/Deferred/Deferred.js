/**
 * Module dependencies
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ReadableStream = require('stream').Readable;
var _ = require('lodash');
_.defaults = require('merge-defaults');
var DEFAULT_LOG = require('../../util/logger');
_.partialApply = require('../../util/partialApply');
var WLUsageError = require('../WLError/WLUsageError');


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

  var self = this;

  // `opts` is optional
  if (typeof opts === 'function' && !worker) {
    worker = opts;
    opts = {};
  }

  // `worker` isn't.
  if (typeof worker !== 'function') {
    throw new WLUsageError({ reason: 'Worker callback required in Deferred constructor' });
  }


  opts = opts || {};
  _.defaults(opts, {

    // A logger can be passed in as `opts.logger`
    // (for use w/ `Deferred.prototype.log()`)
    // Defaults to console.log + console.error
    logger: DEFAULT_LOG.results,

    // Sane default for promise library
    Promise: typeof opts.Promise !== 'undefined' ? opts.Promise :  require('bluebird'),

    // Switchback support is enabled by default
    Switchback: typeof opts.Switchback !== 'undefined' ? opts.Switchback : require('node-switchback')
  });


  // Deferred starts off empty and not flowing.
  this.flowing = false;
  this.empty = false;



  /**
   * Execute the callback of this deferred object.
   * This is the "trigger" that executes the deferred logic.
   * If promises are being used, they call this method.
   */

  this.exec = function (exec_cb) {

    // Build a function which will intercept the execution of `exec_cb`
    var run_exec_cb = function () {
      if (!exec_cb) return;
      exec_cb.apply(self._workerCtx, self._workerResults);
    };

    // The `worker` receives this function as its only argument.
    var whenWorkerFinished = function ( /* args sent back from worker */ ) {

      // Retrieve the results `worker` sent as args to its callback
      // Then save these results and `this` context.
      self._workerResults = Array.prototype.slice.call(arguments);
      self._workerCtx = this;

      // Flag this Deferred as `empty`, meaning its results are ready
      // to use.
      self.empty = true;

      // Emit the `finished` event w/ args from "worker"
      self.emit.apply(self, ['finished'].concat(self._workerResults));

      // Call `exec_cb` with the results that were retrieved from `worker`
      run_exec_cb();
    };


    // If `opts.Switchback` is set, convert `whenWorkerFinished` into a
    // switchback before doing anything else.
    // (fwd `invalid` handler to `error` to support WL1 expectations)
    if (opts.Switchback) {
      whenWorkerFinished = opts.Switchback(whenWorkerFinished, {invalid: 'error'});
    }

    // If the worker never triggers its own callback,
    // this `whenWorkerFinished` function is never called.
    // If it is called, we should clear the timeout for the
    // "never-triggered-exec_callback" warning.
    // TODO: clearTimeout in the appropriate spot

    // TODO: setTimeout + clearTimeout or warning about not
    // triggering the `exec_cb`.


    // If this Deferred is already flowing, don't run
    // the deferred logic again.
    if (this.flowing) {

      // Instead, if the Deferred is already `empty`, run
      // `exec_cb` after one tick.
      if (this.empty) {
        setTimeout(run_exec_cb, 0);
        return this;
      }

      // If the Deferred isn't `empty` yet, bind a handler
      // to listen for when it _is_, and run `exec_cb` then.
      else {
        self.once('finished', function () {
          setTimeout(run_exec_cb, 0);
          return;
        });
        return this;
      }

    }

    // If this Deferred is not flowing yet, run the `worker`
    // and get it flowing.
    else {

      // Call the `worker` and pass it the function we defined above.
      // The definition of this function usually exists in a core
      // method somewhere, and always expects one argument:  a callback.
      this.flowing = true;
      worker(whenWorkerFinished);
      return this;
    }
  };



  /**
   * Alternative to `.exec()`
   *
   * Calls `.exec()`, but pass in a log function as the callback.
   * Useful in the REPL.
   *
   * @return {String}        [to keep console output nicer]
   */
  this.log = function () {
    setTimeout(_.bind(function () {
      this.exec(opts.logger);
    }, this), 0);
    return '...';
  };


  ///////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////
  // Only mess w/ promises if the Promise option was
  // passed to the Deferred constructor.
  if (opts.Promise) {

    // Bluebird-specific:
    if (opts.Promise.onPossiblyUnhandledRejection) {
      opts.Promise.onPossiblyUnhandledRejection(function(error){
        // Ignore `onPossiblyUnhandledRejection`, since user might
        // just be using `.exec()` syntax
      });
    }
    var promise = new opts.Promise(function (accept, reject) {
      self.once('finished', function fulfill (err, result) {
        if (err) return reject(err);
        else return accept(result);
      });
    });

    this.then = function () {
      // start flowing
      self.exec();

      // delegate to real `then`

      return promise.then.apply(promise, arguments);
    };
    this.done = function () {
      // start flowing
      self.exec();

      // delegate to real `done`
      return promise.done.apply(promise, arguments);
    };
  }
  ///////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////

}

// `Deferred` extends from `stream.Readable`
// (which extends from `EventEmitter`)
util.inherits(Deferred, ReadableStream);


module.exports = Deferred;
