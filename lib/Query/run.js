/**
 * Module dependencies
 */

var _ = require('lodash');
// var Readable = require('stream').Readable;
var WLTransform = require('waterline-criteria');

var queryEngine = require('./engine');

// var RecordStream = require('../RecordStream');
// var Record = require('../../Record');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
var WLError = require('root-require')('standalone/WLError');
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

  // console.log(' ******* RUNNING:\n',JSON.stringify(this),'\n\n\n');
  var relation;
  var criteria = this.criteria;

  // If a `worker` is not defined, and it can't be infered,
  // we must send back a usage error.
  if (!this.worker) {
    if (!this.orm) {
      return cb(new WLUsageError(require('util').format('Cannot run Query on relation: "%s" - either a `worker` function or valid `orm` instance must be provided', criteria.from.identity)));
    }

    // But if an `orm` is available on the Query, we can infer
    // the `worker` function by determining the appropriate
    // adapter, datastore, and so forth.  An explicit `worker`
    // will always override the implicit one.
    relation = lookupRelationFrom(criteria.from, this.orm);
    //criteria.from ? query.orm.model(criteria.from) : (criteria.junction ? query.orm.junction(criteria.junction) : null);
    // console.log('running find on relation -->','\ncriteria.from:',criteria.from,'\ncriteria.junction:',criteria.junction);//,query.orm.junction('chatperson'));

    if (!relation) {
      // TODO:
      // consider just identifying the model automatically when this happens
      // (there are plus'es and minus'es to this)
      return cb(new WLUsageError(require('util').format('Cannot run Query on relation: "%s" - no model or junction with that identity exists.  \n%s', criteria.from.identity, require('util').inspect(this) )));
      // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', criteria.from)));
    }

    //
    // || TODO: the usage error checking below can probably be eliminated in favor of
    // \/       an assertion inside of `Adapter.bridge()`
    //          (leaving it alone for now to avoid breaking things ~mike)
    //
    var adapter = relation.getAdapter();
    if (!adapter) {
      // TODO: bundle wl-memory and use it by default, when no other adapter is specified
      // (but emit a warning, b/c that could be confusing in some cases)
      // adapter = require('sails-memory');
      cb(new WLUsageError(require('util').format('Cannot run Query on relation: "%s" - its adapter is not specified or invalid`', criteria.from.identity)));
      return;
      // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', criteria.from)));
    }

    // If we made it here, our Query can infer the relation and desired method.
    // So we'll go ahead and build the adapter worker function:
    this.worker = function adapterWorkerFn (cb) {

      // Call the appropriate raw function- e.g.:
      switch (query.adapterMethod) {
        case '_createRaw':
          return relation._createRaw(query.values, cb);
        case '_updateRaw':
          return relation._updateRaw(query.criteria, query.values, cb);
        case '_destroyRaw':
          return relation._destroyRaw(query.criteria, cb);
        // TODO: others (drop, describe, etc.)
        default:
          return relation._findRaw(criteria, cb);
      }
    };

    // In compatibility mode, if this query has joins, AND IF the
    // target adapter has a `join` method, we should build a worker
    // that calls the `_joinRaw` adapter bridge.
    // Also, the query should be flagged as `raw` and `preCombined` (to skip the integrator)
    if (this.orm && this.orm.compatibilityMode) {
      // console.log('~~~~~> IN COMPATIBILITY MODE');
      // var hasJoins = this.criteria.joins && this.criteria.joins.length;
      var adapterSupportsJoinMethod = relation && relation.getAdapter() && relation.getAdapter().join;
      var hasJoins = this.wl1Joins && this.wl1Joins.length;
      if (hasJoins && adapterSupportsJoinMethod) {
        // console.log('~~~~~> JOINS:', this.criteria.joins);
        this.raw = true;
        this.preCombined = true; // (this flag means "skip the integrator")

        // Mix joins back in to the criteria
        criteria.joins = this.wl1Joins;
        this.worker = function adapterWorkerFn(cb) {
          relation._joinRaw(criteria, cb);
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





  // If we made it here, we must have a worker.
  // Now let's run it.


  // If `raw` is enabled, skip the query engine + integrator.
  if (this.raw) {
    // console.log('\n','-----=======-> Running raw query '+(this.purpose ? '(purpose: '+this.purpose+')': '')+':',this);
    this.worker(function (err, results) {
      if (err) return cb(err);
      // console.log('query.adapterMethod:',query.adapterMethod,'---> raw worker results:',results);

      if (_.isArray(results)) {

        // Fill in the query heap just to pacify tests and simplify WL1 integration
        // TODO: remove this requirement (optimization)
        // query.heap.malloc(criteria.from.identity, query.criteria);
        // query.heap.push(criteria.from.identity, results);
        // query.heap.malloc('root', query.criteria);
        query.heap.push('root', results);
      }

      // Send back raw results
      // (but first run `parseResults()` in case it was defined)
      try {
        return cb(null, query.parseResults(results));
      }
      catch (e) { return cb(e); }
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


    // Each time finalized records are available in the heap for us to use,
    // the Query will push stuff out
    // this.heap.on('batch', function (relationIdentity, someRecords) {

    //   // If this batch of records is NOT from the parent model,
    //   // we can simply ignore it.
    //   if (relationIdentity !== criteria.from.identity) {
    //     return;
    //   }

    //   // console.log('Heap emitted '+someRecords.length+ ' "'+ relationIdentity + '" records::',someRecords);

    //   // Run the integrator
    //   // ...
    //   someRecords = query.heap.integrate(someRecords);
    //   // (TODO)

    //   // New up Records
    //   // ...
    //   // someRecords = _.map(someRecords, function (values) {
    //   //   return new Record(relationIdentity, values);
    //   // });
    //   // (TODO)

    //   // Write records to outgoing record stream
    //   // ...
    //   // stream.push(someRecords);

    //   // If buffering, save records
    //   if (query.buffering) {
    //     results = results.concat(someRecords);
    //   }

    // });


    // When the engine is completely finished, end the output stream
    // and trigger the callback.
    queryEngine(this.criteria, this, function completelyDone(err) {

      // End the stream.
      // stream.push(null);

      // Snip off extra stuff stored in the heap
      // (note: we might be able to remove this and just not store the extra stuff, not sure)
      query.heap._buffers = _.mapValues(query.heap._buffers, function (buffer, key) {
        buffer.records = WLTransform.sort(buffer.records, buffer.sort||{});
        buffer.records = buffer.records.slice((buffer.skip || 0), (buffer.limit || 1000000) + (buffer.skip || 0));
        return buffer;
      });

      // Build up the result set by grabbing the root results out of the heap
      results = query.heap.get('root');

      // Manage flow control
      if (err) {
        return cb(err);
      }

      // Send back buffered results
      // (but first run `parseResults()` in case it was defined)
      if (query.buffering) {
        try {
          return cb(null, query.parseResults(results));
        }
        catch (e) { return cb(e); }
      }

      throw new WLError('`find()` streams not supported in WL2 yet');
      // return cb(null, stream);
    });

  }


  // Chainable
  return this;
};

