/**
 * Module dependencies
 */

var _ = require('lodash');



// THIS MODULE CAN PROBABLY BE REMOVED
// (doesn't seem to be in use anymore, and WLFilter is more robust-
//  unfortunately it doesn't allow for the schema to be passed in though)
// ~mike, july2,2014


/**
 * Removes records matching `pkValuesToRemove` from
 * the `src` array.
 *
 * @param {Object} options
 *   @option  {Array<Object>} src
 *   @option  {Model} model
 *   @option  {Array<PK>|PK} pkValuesToRemove
 * @return {Array}
 */
module.exports = function rejectRecordsWithPKValues(options) {
  var src = options.src;
  var model = options.model;
  var pkValuesToRemove = options.pkValuesToRemove;
  var primaryKeyAttr = model.primaryKey;

  var filteredResults = _.remove(src, function (record) {
    var recordId = record[primaryKeyAttr];
    if (_.isArray(pkValuesToRemove)) {
      return !_.any(pkValuesToRemove, function (removeId) {
        return removeId === recordId;
      });
    }
    return pkValuesToRemove === recordId;
  });

  return filteredResults;
};
