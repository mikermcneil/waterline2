/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * Removes records matching `removeCriteria` from
 * the `src` array.
 *
 * @param {Object} options
 *   @option  {Array<Object>} src
 *   @option  {Model} model
 *   @option  {Array<PK>|PK} removeCriteria
 * @return {Array}
 */
module.exports = function applyBackfilter(options) {
  var src = options.src;
  var model = options.model;
  var removeCriteria = options.removeCriteria;
  var primaryKeyAttr = model.primaryKey;
  // console.log('** applyBackfilter:',src,removeCriteria);
  var backFilteredResults = _.remove(src, function (record) {
    var recordId = record[primaryKeyAttr];
    if (_.isArray(removeCriteria)) {
      return !_.any(removeCriteria, function (removeId) {
        return removeId === recordId;
      });
    }
    return removeCriteria === recordId;
  });
  // console.log('**--> backfilter results:', backFilteredResults);
  return backFilteredResults;
};
