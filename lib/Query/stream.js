/**
 * Module dependencies
 */

var WLUsageError = require('../WLError/WLUsageError');
var RecordStream = require('../RecordStream');




/**
 * Run the queued operations in this Query.
 *
 * @return {RecordStream}
 */

module.exports = function stream () {

  // `operations` - the instruction set (a POJO)
  var operations = this.operations;

  // `ins` - in-bound stream of data for creates or updates
  // At this point, `ins` will be a RecordStream
  // (this is normalized `.values()`)
  var ins = this.ins;



  // (1) Preparation Stage     [find, update, create, destroy]
  //
  // TODO: Look up and get access to the Database instances used in
  // `operations`, and consequently, their adapters.
  var databases = [];

  // (2) Retrieval Stage       [find, update, destroy]
  //
  // TODO: Execute any `find` or `update` criteria `operations` at the adapter
  // level, and store the results in this Query's cache.  Partial/batch adapter
  // operations which must be executed piecemeal (e.g. subqueries) should
  // still store their results in the cache.
  var cache = {};

  // (3.a) Integration Stage   [find]
  //
  // TODO: For `find` queries that involve a `populate`, run the query integrator
  // to clean and mash up the data, e.g. performing in-memory joins, to build
  // a RecordStream instance representing the data.
  var retrievedRecords = new RecordStream();

  // (3.b) Persistence Stage   [create]
  //
  // TODO: Execute any relevant creates (persistence `operations`) at the adapter
  // level. Receive the incoming array or stream of records from the adapter, using
  // atransformer to new up a RecordStream.
  var createdRecords = new RecordStream();

  // (4) Hand-off              [find, update, create, destroy]
  //
  // TODO: pass back the final RecordStream instance
  // (depending on usage, it will either remain as a string or be buffered
  // into a RecordCollection or single Record)
  var results = retrievedRecords || createdRecords;
  return resultStream;
};
