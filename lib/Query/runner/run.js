/**
 * Module dependencies
 */

var queryEngine = require('./engine');
var WLUsageError = require('../../WLError/WLUsageError');


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
        return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', operations.from)));
      }
      var adapter = model.getAdapter();
      if (!adapter) {
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
    queryEngine(this.operations, this, function (err) {

      // No integrator yet, so for now we stub our results-
      // just pass back the query cache:
      cb(err, self.cache);
    });

  }


  // Chainable
  return this;
};

