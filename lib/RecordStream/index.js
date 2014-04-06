/**
 * Module dependencies
 */

var RecordCollection = require('../lib/RecordCollection');
var util = require('util');
var ReadableStream = require('stream').ReadableStream;


/**
 * Construct a RecordStream.
 *
 * Representation of an ordered set of Records as a ReadableStream.
 *
 * @constructor
 * @param { ReadableStream{Object|Record} | Array{Object|Record} } records
 */
function RecordStream (records) {

  RecordStream.super_.call(this);
}

util.inherits(RecordStream, ReadableStream);


/**
 * Buffer this RecordStream, converting it into a RecordCollection.
 *
 * @return {} [description]
 */
RecordStream.prototype.toRecordCollection = function (cb) {
  var RecordCollection = new RecordCollection();

  // TODO: finish impl
  //
  cb(null, RecordCollection);
};


module.exports = Record;
