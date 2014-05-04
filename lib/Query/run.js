/**
 * Module dependencies
 */

var _ = require('lodash');
var Readable = require('stream').Readable;
var RecordStream = require('../RecordStream');
var queryEngine = require('./engine');
var WLUsageError = require('../WLError/WLUsageError');
var Record = require('../Record');
var constructAll = require('../../util/constructAll');



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

  // TODO: bring criteria/operations normalization over from wl1.0


  // If a `worker` is not defined, and it can't be infered,
  // we must send back a usage error.
  //
  // But if an `orm` is available on the Query, we can infer
  // the `worker` function by determining the appropriate
  // adapter, database, and so forth.  An explicit `worker`
  // will always override the implicit one.
  if (!this.worker) {
    if (!this.orm) {
      cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - either a `worker` function or valid `orm` instance must be provided', operations.from)));
      return;
    }
    else {
      var operations = this.operations;
      var model = this.orm.model(operations.from);
      if (!model) {
        // TODO:
        // consider just identifying the model automatically when this happens
        // (there are plus'es and minus'es to this)
        return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', operations.from)));
      }

      var adapter = model.getAdapter();
      if (!adapter) {
        // TODO: bundle wl-memory and use it by default
        // adapter = require('sails-memory');
        return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', operations.from)));
      }

      this.worker = function (cb) {
        // Now plug this Query into the adapter
        // TODO: replace with Adapter.wrap() usage
        adapter.find(operations, cb);
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
    var self = this;

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

      // console.log('Cache emitted '+someRecords.length+ ' "'+ modelIdentity + '" records::',someRecords);

      // Run the integrator
      // ...
      someRecords = someRecords;
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
      else return cb(null, stream);
    });

  }


  // Chainable
  return this;
};

