/**
 * Module dependencies
 */

var WLUsageError = require('../WLError/WLUsageError');




/**
 * Execute the queued operations in this Query.
 *
 * @param  {Function} cb
 */

module.exports = function executeQuery (cb) {

  if (true) {
    return cb(new WLUsageError({ reason: 'Not implemented yet' }));
  }

  var operations = this.operations;

  // TODO: Look up and get access to the adapters used in `operations`.
  //
  // TODO: Execute `operations` at the adapter level, and
  // store the results in this Query's cache.  Partial/batch adapter
  // operations which must be executed piecemeal (e.g. subqueries) should
  // still store their results in the cache.
  //
  // TODO: Run the query integrator to clean and mash up the data,
  // e.g. performing in-memory joins, to build a RecordCollection instance
  // representing the data.
  var records = new RecordCollection();

  // TODO: pass the final RecordCollection instance back to the ORM user
  return cb(null, records);
};
