/**
 * Module dependencies
 */

var _ = require('lodash');
var Readable = require('stream').Readable;
var RecordStream = require('../RecordStream');
var queryEngine = require('./engine');
var integrator = require('./integrator');
var WLUsageError = require('../WLError/WLUsageError');
var Record = require('../Record');
var interpolate = require('../Adapter/interpolate');


/**
 * Run a Query.
 *
 * Functions as the "worker" function passed to the
 * Query's inherited Deferred constructor.
 *
 * @param  {Function} cb [description]
 * @return {Query}
 * @api private
 * @chainable
 */

module.exports = function run (cb) {
  var self = this;

  // If a `worker` is not defined, and it can't be infered,
  // we must send back a usage error.
  if (!this.worker) {
    if (!this.orm) {
      cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - either a `worker` function or valid `orm` instance must be provided', operations.from)));
      return;
    }

    // But if an `orm` is available on the Query, we can infer
    // the `worker` function by determining the appropriate
    // adapter, database, and so forth.  An explicit `worker`
    // will always override the implicit one.
    else {
      var operations = this.operations;
      var model = this.orm.model(operations.from);
      if (!model) {
        // TODO:
        // consider just identifying the model automatically when this happens
        // (there are plus'es and minus'es to this)
        cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', operations.from)));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', operations.from)));
      }

      var adapter = model.getAdapter();
      if (!adapter) {
        // TODO: bundle wl-memory and use it by default, when no other adapter is specified
        // (but emit a warning, b/c that could be confusing in some cases)
        // adapter = require('sails-memory');
        cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', operations.from)));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', operations.from)));
      }

      // If we made it here, our Query can infer an adapter worker
      // using its ORM instance:
      this.worker = function adapterWorkerFn (cb) {

        // Build function that will communicate w/ the adapter
        var fn = interpolate({
          method: 'find',
          usage: [
            {
              label: 'criteria',
              type: 'object'
            },
            {
              label: 'callback',
              type: 'function',
              optional: true
            }
          ],
          adapterUsage: ['Database', 'model identity', 'attributes', 'callback']
        });

        // Then call it
        fn(operations, cb);


        // // If `compatibilityMode` is enabled, use and expect
        // // traditional WL1 adapter syntax.  Here, that means
        // // calling `find` using the appropriate function signature.
        // //
        // // TODO: bring `compatibilityMode` stuff into `Adapter.interpolate()`
        // // to help preserve separation of concerns and avoid repeating ourselves.
        // if (self.orm.compatibilityMode) {

        //   adapter.find(model.database, model.identity, operations, cb);

        //   // TODO: delete this when everything's working and we're sure we won't need
        //   // this log to play around with anymore.
        //   // ||
        //   // \/
        //   //
        //   // var interceptorFn = require('node-switchback')(function () {
        //   //   console.log('Back from WL1 adapter:', arguments);
        //   //   // In order to make: `_.partial(cb, a0, a1, a2, ...)`
        //   //   // We have to do:
        //   //   var composed_cb = _.partial.apply(null, [cb].concat(Array.prototype.slice.call(arguments)));
        //   //   composed_cb();
        //   // }, {invalid: 'error'});
        //   // adapter.find(model.database, model.identity, operations, interceptorFn);

        // }
        // // TODO: replace with Adapter.interpolate() usage
        // else adapter.find(operations, cb);

      };
    }
  }


  // Now, if we made it here- run the worker:

  // If `raw` is enabled, skip the query engine + integrator.
  if (this.raw) {
    this.worker(cb);
  }

  // If `raw` is disabled (this is the default)
  // run the query engine and integrator.
  else {

    // No matter what, build an outgoing record stream
    // ...
    // var stream = new RecordStream();

    // If this query will be buffered, set up a container
    // to store the records in.
    var results;
    if (this.buffering) {
      results = [];
    }


    // Each time records are available in the cache...
    this.cache.on('batch', function (modelIdentity, someRecords) {

      // If this batch of records is NOT from the parent model,
      // we can simply ignore it.
      if (modelIdentity !== self.operations.from) {
        return;
      }

      // console.log('Cache emitted '+someRecords.length+ ' "'+ modelIdentity + '" records::',someRecords);

      // Run the integrator
      // ...
      someRecords = integrator(someRecords);
      // (TODO)

      // New up Records
      // ...
      // someRecords = _.map(someRecords, function (values) {
      //   return new Record(modelIdentity, values);
      // });
      // (TODO)

      // Write records to outgoing record stream
      // ...
      // stream.push(someRecords);

      // If buffering, save records
      if (self.buffering) {
        results = results.concat(someRecords);
      }

    });


    // When the engine is completely finished, end the output stream
    // and trigger the callback.
    queryEngine(this.operations, this, function completelyDone(err) {

      // End the stream.
      // stream.push(null);

      // Manage flow control
      if (err) return cb(err);
      else if (self.buffering) return cb(null, results);
      // else return cb(null, stream);
    });

  }


  // Chainable
  return this;
};

