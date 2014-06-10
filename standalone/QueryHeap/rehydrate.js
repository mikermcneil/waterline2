/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');

var WLError = require('root-require')('standalone/WLError');
var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');

/**
 * [exports description]
 * @param  {[type]} bufferIdentity [description]
 * @param  {[type]} records     [description]
 * @return {[type]}             [description]
 */
module.exports = function rehydrate (bufferIdentity, records) {
  if (!this._buffers[bufferIdentity]) {
    throw new WLUsageError(util.format(
      'QueryHeap cannot rehydrate buffer ("%s") because it does not exist',
      util.inspect(bufferIdentity, false, null)
    ));
  }
  else {
    console.log ('~~~~) Hydrating '+bufferIdentity+ ' with '+records.length+' records:',records);
    var buffer = this._buffers[bufferIdentity];
    var relation = lookupRelationFrom(buffer.from, this.orm);

    _.each(records, function (hydratedRecord) {
      var matchingFootprint = _.find(buffer.records, function (footprint) {
        return hydratedRecord[relation.primaryKey] === footprint[relation.primaryKey];
      });

      // If no matching footprint exists, throw an error.
      if (!matchingFootprint) {
        throw new WLError('Trying to rehydrate a heap buffer with new data, but an expected footprint is missing.'+
          '\nbuffer.records (i.e. footprints):  '+util.inspect(buffer.records, false, null) +
          '\nhydrated records:  '+util.inspect(records, false, null));
      }

      _.extend(matchingFootprint, hydratedRecord);

    });
  }
};
