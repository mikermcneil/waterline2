/**
 * Module dependencies
 */

var WLUsageError = require('../WLError/WLUsageError');
var RecordStream = require('../RecordStream');


/**
 * `Query.prototype.values()`
 *
 * An operation modifier that allows users to specify
 * `values` or an array of `values` objects for use in
 * a `create` or `update` query.
 *
 * Sets Query's `opts.values`, normalizing various input types
 * to a RecordStream (a ReadableStream of Records).
 *
 * @param {             userData
 *        Object
 *        Array{Object}
 *        Stream{Object}
 *        Record
 *        Array{Record}
 *        Stream{Record}
 *        RecordCollection
 *        RecordStream
 *        }
 * @return {Query}
 */

module.exports = function values (userData) {

  var incomingRecords;

  if ( !_.isObject(userData) ) {
    throw new WLUsageError({ reason: 'Invalid usage of .values() modifier' });
  }
  else if (_.isArray(userData)) {
    // TODO: new up a RecordStream on the fly, emit all Records in order
    incomingRecords = new RecordStream();
  }
  else if (userData instanceof RecordStream) {
    // If `userData` is already a RecordStream, we're good.
    incomingRecords = userData;
  }
  else if (userData instanceof RecordCollection) {
    // TODO: new up a RecordStream on the fly, emit all Records in order
    incomingRecords = new RecordStream();
  }
  else if (userData instanceof Record) {
    // TODO: new up a RecordStream on the fly, emit the Record
    incomingRecords = new RecordStream();
  }
  else {
    // TODO: new up a RecordStream on the fly, emit the Record
    incomingRecords = new RecordStream();
  }

  this.options({
    values: incomingRecords
  });

  return this;
};
