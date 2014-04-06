/**
 * Module dependencies
 */

var RecordCollection = require('../lib/RecordCollection');
var util = require('util');
var ReadableStream = require('stream').ReadableStream;


/**
 * Construct a RecordStream.
 *
 * Representation of a set of Records as a ReadableStream.
 *
 * -----------------------------------------------------------------
 * Notice about `sort`
 *
 * A RecordStream has no implicit guarantee of order -- it will
 * maintain the order in which records are emitted.
 *
 * For instance, during a `find` query, if the underlying adapter
 * supports the `sort` query modifier for streaming `find` output,
 * the resulting RecordStream will be in the requested order.
 * But the integrator can not guarantee the "sortability" of a set of
 * records of indeterminate cardinality since the set might not fit
 * in the server's available memory space.
 *
 * Options to configure the maximum number of records to buffer
 * during a `find` query, as well as whether buffering should take
 * place at all, are configurable in each Query instance.
 * -----------------------------------------------------------------
 *
 * @constructor
 * @param { ReadableStream{Object|Record} | Array{Object|Record} } records
 */
function RecordStream (records) {

  RecordStream.super_.call(this);
}

util.inherits(RecordStream, ReadableStream);


/**
 * Buffer this RecordStream, collecting its output in memory,
 * converting it into a RecordCollection.
 *
 * @return {} [description]
 */
RecordStream.prototype.buffer = function (cb) {
  var RecordCollection = new RecordCollection();

  // TODO: finish impl
  //
  cb(null, RecordCollection);
};


module.exports = Record;
