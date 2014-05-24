/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Relation.prototype._findAndJoinRaw()`
 *
 * ONLY SUPPORTED FOR ADAPTERS IMPLEMENTING THE >= v2.0.0 WATERLINE ADAPTER API.
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `findAndJoin()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.find().populate('someAssociation').options({raw: true})
 * ```
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'findAndJoin',
  usage: [
    {
      label: 'criteria',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});
