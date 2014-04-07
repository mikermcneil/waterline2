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
  // However, if promises are enabled, the flow will begin
  // immediately.  Once the Deferred is `flowing`, calling
  // `.exec()` again will have no effect.



  // Waterline.Deferred: Promises & "flowing"
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

    var emitter = this;

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
    var did=(Math.floor(Math.random()*1000));
    // console.log('-----'+did+'-----');
    this.exec = function (exec_cb) {
      var self = this;
      // console.log('exec');
      // console.log('#'+did+' triggered .exec()');

      // The `worker` receives this function as its
      // first argument.
      var onEmpty = function onEmpty ( /* args sent back from worker */ ) {
        // Retrieve the results `worker` sent as args to its callback
        var workerResults = Array.prototype.slice.call(arguments);

        // Save worker results and context
        self._workerResults = workerResults;
        self._workerCtx = this;

        // If supported, emit the `done` event w/ args from "worker"
        if (emitter.emit) {
          emitter.emit.apply(emitter, ['finished'].concat(workerResults));
        }
        self.empty = true;
        // console.log('done');

        // If the worker never triggers its own callback,
        // this `onEmpty` function is never called.
        // If it is called, we should clear the timeout for the
        // "never-triggered-exec_callback" warning.
        // TODO: clearTimeout

        // Call `exec_cb` with the results that were retrieved from `worker`
        if (!exec_cb || self.triggeredExec) return;
        // console.log('#'+did+ ' triggered exec_cb');
        self.triggeredExec = true;
        var call_exec_cb_withResults = _.partialApply(exec_cb, workerResults);
        return call_exec_cb_withResults();
      };

      // TODO: setTimeout + clearTimeout or warning about not
      // triggering the `exec_cb`.


      // If this Deferred is already flowing, don't run
      // the deferred logic again.
      // (any attached callbacks will still fire after a tick)
      if (this.flowing) {
        setTimeout(function () {
          if (!exec_cb || self.triggeredExec) return;
          // console.log('#'+did+ ' triggered exec_cb');
          self.triggeredExec = true;
          exec_cb.apply(self._workerCtx, self._workerResults);
        }, 0);
      }
      else {
        // Call the `worker` and pass it the function we defined above.
        // The definition of this function usually exists in a core method somewhere,
        // and always expects one argument:  a callback.
        // console.log('#'+did+ ' triggered worker');
        this.flowing = true;
        return worker(onEmpty);
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


    // var promise;


    // If Promise constructor was specified, instantiate Promise.
    if (config.Promise) {

      var self = this;

      // The Promise instance we augment must be manufactured, not extended.
      // That is, it is a "lookalike"-- not really an instance of Deferred.
      // This is because, in most Promise impls, the constructor is "frozen"
      // (at least this is true for Q and Bluebird)
      // Alternatively, we can use promises as a mixin (that's what we're
      // doing now)
      //
      // For more information, see:
      // https://github.com/promises-aplus/constructor-spec/issues/6#issuecomment-11618368


      // Construct promise right away
      // (this Deferred will be flowing immediately)
      var p = new config.Promise(function (accept, reject) {
        emitter.on('finished', function fulfill (err, result) {
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

        p.done.apply(p, arguments);
      };
      ///////////////////////////////////////////////////////


      // Ensure that the manufactured object we're returning (`promise`)
      // looks and feels identical to a vanilla Deferred instance.
      // _.extend(this, promise);
      // _.bindAll(this);
      // promise = this;
    }


    // If Deferred is in `flowingMode`, run `.exec()` immediately.
    // (calling .exec() in user code again will have no additional effect)
    // if (config.flowingMode) {
    //   this.exec();
    // }

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

