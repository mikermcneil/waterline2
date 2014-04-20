/**
 * Module dependencies
 */

var util = require('util');
var RecordCollection = require('../RecordCollection');
var Record = require('../Record');
var WLError = require('../WLError');
// var Terminus = require('terminus');
var ReadableStream = require('stream').Readable;


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
 * @param {         src
 *   RecordStream
 *   Array{Record}
 *   Array{Object}
 *   ReadableStream{Object}
 *   Record
 *   Object
 * }
 */
function RecordStream (src) {

  RecordStream.super_.call(this, {
    objectMode: true
  });


  // Unexpected source (type violation)
  if ( typeof src !== 'object' ) {
    throw new WLError({reason: 'Invalid `src` passed to RecordStream constructor.', src: src});
  }

  // If `src` is a RecordStream, pipe `src` onto `this.
  else if (src instanceof RecordStream) {
    return src.pipe(this);
  }

  // If `src` is some other stream of Objects, this should
  // act as a Transform stream-- push Records onto this RecordStream.
  else if (src) {

  }

  // If `src` is just a single Object or Record, push a single Record
  // onto this RecordStream.
  else if (src) {

  }

  // If `src` is an Array of Object or Record, push the Records
  // from it onto this RecordStream.
  else if (src) {

  }



  /**
   * Push Records on the RecordStream.
   *
   * _read will be called when the stream wants to pull more data in.
   *
   * @param  {[type]} size  [advisory argument, is ignored (for now)]
   * @api private
   */

  this._read = function pump(size) {




    // Retrieve a record from the data source
    console.log('read requested');
    var record = src.read();
    record = record instanceof Record ? record : new Record(record);
    this.push(record);

  };

}

util.inherits(RecordStream, ReadableStream);




/**
 * Concat the Records in this RecordStream in memory into
 * a RecordCollection buffer.
 *
 * @param  {Function} cb  ({WLError}, {RecordCollection})
 * @return {RecordStream}
 */

RecordStream.prototype.buffer = function (cb) {

  // TODO!

  // Commenting out for now to save space:

  // return this.pipe(Terminus.concat({
  //   objectMode: true
  // }, function onFinish (records) {
  //   cb(null, new RecordCollection(records));
  // }));
};


module.exports = RecordStream;
