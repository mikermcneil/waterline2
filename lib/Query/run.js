/**
 * Module dependencies
 */

var _ = require('lodash');
// var Readable = require('stream').Readable;

var queryEngine = require('./criteria/engine');

// var RecordStream = require('../RecordStream');
// var Record = require('../../Record');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');



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
  var query = this;

  var model;
  var criteria;

  // If a `worker` is not defined, and it can't be infered,
  // we must send back a usage error.
  if (!this.worker) {
    if (!this.orm) {
      cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - either a `worker` function or valid `orm` instance must be provided', criteria.from)));
      return;
    }

    // But if an `orm` is available on the Query, we can infer
    // the `worker` function by determining the appropriate
    // adapter, datastore, and so forth.  An explicit `worker`
    // will always override the implicit one.
    else {
      criteria = this.criteria;
      model = this.orm.model(criteria.from);
      if (!model) {
        // TODO:
        // consider just identifying the model automatically when this happens
        // (there are plus'es and minus'es to this)
        cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists.  \n%s', criteria.from, require('util').inspect(this) )));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', criteria.from)));
      }

      //
      // || TODO: the usage error checking below can probably be eliminated in favor of
      // \/       an assertion inside of `Adapter.bridge()`
      //          (leaving it alone for now to avoid breaking things ~mike)
      //
      var adapter = model.getAdapter();
      if (!adapter) {
        // TODO: bundle wl-memory and use it by default, when no other adapter is specified
        // (but emit a warning, b/c that could be confusing in some cases)
        // adapter = require('sails-memory');
        cb(new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', criteria.from)));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', criteria.from)));
      }

      // If we made it here, our Query can infer the model, desired method,
      // and therefore the adapter worker using its ORM instance:
      this.worker = function adapterWorkerFn (cb) {

        // TODO:
        // Call the appropriate raw function- one of:
        // -> _findRaw()
        // -> _destroyRaw()
        // -> _updateRaw()

        model._findRaw(criteria, cb);
      };

      // console.log('\n\n\n','----------------------running query:---------------------');
      // console.log('is orm in compatibilityMode?', this.orm.compatibilityMode);

      // In compatibility mode, if this query has joins, AND IF the
      // target adapter has a `join` method, we should build a worker
      // that calls the `_joinRaw` adapter bridge.
      // Also, the query should be flagged as `raw` and `preCombined` (to skip the integrator)
      if (this.orm && this.orm.compatibilityMode) {
        // console.log('~~~~~> IN COMPATIBILITY MODE');
        var adapterSupportsJoinMethod = model && model.getAdapter() && model.getAdapter().join;
        var hasJoins = this.criteria.joins && this.criteria.joins.length;
        if (hasJoins && adapterSupportsJoinMethod) {
          // console.log('~~~~~> JOINS:', this.criteria.joins);
          this.raw = true;
          this.preCombined = true; // (this flag means "skip the integrator")
          this.worker = function adapterWorkerFn(cb) {
            model._joinRaw(criteria, cb);
          };
        }

        // Also, in compatibility mode, aggregation queries are always `raw` and `preCombined`
        if(this.criteria.groupBy || this.criteria.sum || this.criteria.average || this.criteria.min || this.criteria.max) {
          // They also need `limit`, `skip`, and `select` removed
          delete this.criteria.select;
          delete this.criteria.limit;
          delete this.criteria.skip;
          this.raw = true;
          this.preCombined = true;
        }
      }
    }

  }





  // Now, if we made it here- run the worker:


  // If `raw` is enabled, skip the query engine + integrator.
  if (this.raw) {
    this.worker(function (err, results) {
      if (_.isArray(results)) {

        // Fill in the query heap just to pacify tests and simplify WL1 integration
        // TODO: remove this requirement (optimization)
        query.heap.push(criteria.from, results);
      }

      cb(err, results);
    });
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


    // Each time records are available in the heap...
    this.heap.on('batch', function (modelIdentity, someRecords) {

      // If this batch of records is NOT from the parent model,
      // we can simply ignore it.
      if (modelIdentity !== query.criteria.from) {
        return;
      }

      // console.log('Heap emitted '+someRecords.length+ ' "'+ modelIdentity + '" records::',someRecords);

      // Run the integrator
      // ...
      someRecords = query.heap.integrate(someRecords);
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
      if (query.buffering) {
        results = results.concat(someRecords);
      }

    });


    // When the engine is completely finished, end the output stream
    // and trigger the callback.
    queryEngine(this.criteria, this, function completelyDone(err) {

      // End the stream.
      // stream.push(null);

      // Manage flow control
      if (err) return cb(err);
      else if (query.buffering) return cb(null, results);
      // else return cb(null, stream);
    });

  }


  // Chainable
  return this;
};

