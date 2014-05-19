/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Model._joinRaw()`
 *
 * ONLY SUPPORTED FOR ADAPTERS IMPLEMENTING THE ORIGINAL (<2.0.0) WATERLINE ADAPTER API.
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `join()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.find().populate('someAssociation')
 * ```
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'join',
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
    '<2.0.0': ['Database.identity', 'Model.cid', 'criteria', 'callback']
  }
});
