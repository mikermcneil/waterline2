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
 * @param  {Boolean} justFootprints
 *
 * @chainable
 */
module.exports = function push (bufferIdentity, newRecords, justFootprints) {

  if (!this._buffers[bufferIdentity]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot push to buffer ("%s") because it does not exist',
      util.inspect(bufferIdentity, false, null)
    ));
  }
  else {

    var buffer = this._buffers[bufferIdentity];
    var relation = lookupRelationFrom(buffer.from, this.orm);

    // If the `justFootprints` flag is enabled, `newRecords` will be stripped-down to only
    // the minimal set of data which is absolutely necessary for uniquely identifying a given
    // record, i.e. primary key values, & the values of any attribute in the criteria's sort vectors.
    // For example, cursors which enable `justFootprints` in their buffer must execute one
    // additional query get the rest of the attribute values necessary for a complete result set.
    // But as you've probably already deduced, a complete result set is not always strictly necessary,
    // and so oftentimes `justFootprints` is all we need - and it also reduces memory-usage.
    if (justFootprints) {
      newRecords = _.map(newRecords, function _generateFootprint(newRecord) {
        return _.pick(newRecord, function _pickOrOmitKey (val, attrName) {
          return attrName === relation.primaryKey || _.contains(_.keys(buffer.sort), attrName);
        });
      });
    }

    //  • Calculate the union of `newRecords` and the existing `buffer.records`,
    //    but in the case of a duplicate, allow the new record to override the old
    //    (this allows us to merge complete records on top of any existing footprints)
    _.each(newRecords, function (newRecord) {
      var extantMatchingRecord = _.find(buffer.records, function (existingRecord) {
        return existingRecord[relation.primaryKey] === newRecord[relation.primaryKey];
      });
      if (extantMatchingRecord) {
        _.extend(extantMatchingRecord, newRecord);
      }
      else {
        buffer.records.push(newRecord);
      }
    });

    console.log('Post-push(%s, %s), new buffer.records:', bufferIdentity, util.inspect(newRecords), buffer.records);

    //  • Then run WLTransform to turn the result into a sorted set.
    //  • Finally, prune any records which can be safely discarded.
    //    (NOTE: must keep at least `skip`+`limit` records to guarantee correctness of result set)
    buffer.records = WLTransform.sort(buffer.records, buffer.sort||{});
    buffer.records = _.first(buffer.records, (buffer.skip + buffer.limit)||1000);

    return this;
  }
};



// var newUniqueRecords = _.where(newRecords, function ifUnique(newRecord) {
    //   var extantMatchingResult = _.find(buffer.records, function (existingRecord){
    //     return existingRecord[relation.primaryKey] === newRecord[relation.primaryKey];
    //   });
    //   // If a result with the same primary key already exists, merge new with old.
    //   if (extantMatchingResult) {
    //     extantMatchingResult = _.extend(extantMatchingResult, newRecord);
    //     return false;
    //   }
    //   else return true;
    // });
    // buffer.records.push.apply(buffer.records, newUniqueRecords);
