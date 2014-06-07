/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * Push `newRecords` to the buffer specified by `bufferIdentity`.
 *
 * @param  {String} bufferIdentity   [usually a treepath for some criteria object]
 * @param  {Array} newRecords
 *
 * @chainable
 */
module.exports = function push (bufferIdentity, newRecords) {

  if (!this._buffers[bufferIdentity]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot push to buffer ("%s") because it does not exist',
      util.inspect(bufferIdentity, false, null)
    ));
  }
  else {

    var buffer = this._buffers[bufferIdentity];
    var relation = lookupRelationFrom(buffer.from, this.orm);

    // If `justFootprints` is enabled, transform each record into a stripped-down
    // projection that consists of only its primary key and sort vector values.
    if (buffer.justFootprints) {
      newRecords = _.map(newRecords, function _generateFootprint(newRecord) {
        return _.pick(newRecord, function _pickOrOmitKey (val, attrName) {
          return attrName === relation.primaryKey || _.contains(_.keys(buffer.sort), attrName);
        });
      });
    }

    //  • Calculate the union of `newRecords` and the existing `buffer.records`,
    //    but in the case of a duplicate, allow the new record to override the old
    //    (this allows us to merge complete records on top of any existing footprints)
    var newUniqueRecords = _.where(newRecords, function ifUnique(newRecord) {
      var extantMatchingResult = _.find(buffer.records, function (existingResult){
        return existingResult[relation.primaryKey] === newRecord[relation.primaryKey];
      });
      // If a result with the same primary key already exists, merge new with old.
      if (extantMatchingResult) {
        _.extend(extantMatchingResult, newRecord);
        return false;
      }
      else return true;
    });
    buffer.records.push.apply(buffer.records, newUniqueRecords);
    console.log('newUniqueRecords',newUniqueRecords);

    //  • Then run WLTransform to turn the result into a sorted set.
    //  • Finally, prune any records which can be safely discarded.
    //    (NOTE: must keep at least `skip`+`limit` records to guarantee correctness of result set)
    buffer.records = WLTransform.sort(buffer.records, buffer.sort);
    buffer.records = _.first(buffer.records, (buffer.skip + buffer.limit)||1000);

    return this;
  }
};
