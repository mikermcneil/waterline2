/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
_.partialApply = require('../../util/partialApply');
var EventEmitter = require('events').EventEmitter;
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


  // Waterline.Deffered: "emptiness" & "flowing"
  //
  // A Deferred always starts off with `this.empty=false`
  // It also starts off with `this.flowing=false`, with
  // the flow started by a manual call to `.exec()`.
  //
  // @promise users:  Note that `.then()`, `.done()`,
  // and comparable methods call `.exec()` implicitly.
  //
  // Once the Deferred is `flowing`, calling `.exec()` again
  // will have no effect, although it will still bind another
  // callback if one is provided.



  // Waterline.Deferred: Promises & "flowing"
  //
  // The standard usage of Deferred is fundamentally different
  // than that of Promises.  Promises start executing immediately,
  // whereas a Waterline Deferred waits until `.exec()` is called.
  //
  // So how do we handle this?  If you call `then` or `done` on a
  // Waterline deferred, it will put the Deferred in flowing mode
  // immediately (i.e. no further modifications can be safely made
  // before the deferred logic is executed). That is, the logic starts
  // running immediately (well.. almost-- after one cycle of
  // the event loop, i.e. `setTimeout(...,0)`)


  // Configure Waterline Deferred constructor:
  config = config || {};
  _.defaults(config, {
    Promise: require('bluebird')
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

    var self = this;

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
          return;
        }

        // If the Deferred isn't `empty` yet, bind a handler
        // to listen for when it _is_, and run `exec_cb` then.
        else {
          self.on('finished', function () {
            setTimeout(run_exec_cb, 0);
            return;
          });
          return;
        }

      }

      // If this Deferred is not flowing yet, run the `worker`
      // and get it flowing.
      else {

        // Call the `worker` and pass it the function we defined above.
        // The definition of this function usually exists in a core
        // method somewhere, and always expects one argument:  a callback.
        this.flowing = true;
        return worker(whenWorkerFinished);
      }
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


    // If Promise constructor was specified, instantiate Promise.
    if (config.Promise) {

      // To truly extend a Promise, the Deferred instance we create must be
      // manufactured, not extended.
      // That is, it is a "lookalike"-- not really an instance of Deferred.
      // This is because, in most Promise impls, the constructor is "frozen"
      // (at least this is true for Q and Bluebird)
      //
      // For now, we are using promises as a mixin (wrapping an instance and
      // intercepting the related methods.)
      //
      // For more information, see:
      // https://github.com/promises-aplus/constructor-spec/issues/6#issuecomment-11618368

      // Construct promise right away
      // (this Deferred will be flowing immediately)
      var p = new config.Promise(function (accept, reject) {
        self.on('finished', function fulfill (err, result) {
          // console.log('fulfilled promise (promise triggered exec())');
          if (err) return reject(err);
          else return accept(result);
        });
      });

      ///////////////////////////////////////////////////////
      this.then = function () {
        // start flowing
        self.exec();

        // delegate to real `then`
        return p.then.apply(p, arguments);
      };
      this.done = function () {
        // start flowing
        self.exec();

        // delegate to real `done`
        return p.done.apply(p, arguments);
      };

      // Support some of the most popular (but optional) promise methods:
      if (p.fail) {
        this.fail = function () {

          // start flowing
          self.exec();

          // delegate to real `fail` if it exists
          return p.fail.apply(p, arguments);
        };
      }
      ///////////////////////////////////////////////////////


      // Ensure that the manufactured object we're returning (`promise`)
      // looks and feels identical to a vanilla Deferred instance.
      // _.extend(this, promise);
      // _.bindAll(this);
      // promise = this;
    }

  }

  // `Deferred` extends from `EventEmitter`
  util.inherits(Deferred, EventEmitter);


  return Deferred;

};

