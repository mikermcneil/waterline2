/**
 * Module dependencies
 */

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * `Query.prototype.set()`
 *
 * A Query modifier method that allows users to specify
 * `values` or an array of `values` objects for use in
 * a `create` or `update` query.
 *
 * Sets Query's `values`, normalizing various input types
 * into a Readable stream of Records.
 *
 * @param {             userData
 *        Object
 *        Array{Object}
 *        Stream{Object}
 *        Record
 *        Array{Record}
 *        Stream{Record}
 *        RecordCollection
 *        }
 * @return {Query}
 */

module.exports = function __set__ (userData) {

  //TODO:

  // var incomingRecords;

  // if ( !_.isObject(userData) ) {
  //   throw new WLUsageError({ reason: 'Invalid usage of .set() modifier' });
  // }
  // else if (_.isArray(userData)) {
  //   // TODO: new up a RecordStream on the fly, emit all Records in order
  //   incomingRecords = new RecordStream();
  // }
  // else if (userData instanceof RecordStream) {
  //   // If `userData` is already a RecordStream, we're good.
  //   incomingRecords = userData;
  // }
  // else if (userData instanceof RecordCollection) {
  //   // TODO: new up a RecordStream on the fly, emit all Records in order
  //   incomingRecords = new RecordStream();
  // }
  // else if (userData instanceof Record) {
  //   // TODO: new up a RecordStream on the fly, emit the Record
  //   incomingRecords = new RecordStream();
  // }
  // else {
  //   // TODO: new up a RecordStream on the fly, emit the Record
  //   incomingRecords = new RecordStream();
  // }

  // this.options({
  //   values: incomingRecords
  // });

  // return this;
};
