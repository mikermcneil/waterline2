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

  // Send back a usage error if no worker was specifed.
  if (!this.worker) {
    cb(new WLUsageError('Cannot run a Query without a worker fn'));
  }

  // If `raw` is enabled, skip the query engine + integrator.
  else if (this.raw) {
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

