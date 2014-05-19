/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Model._findAndJoinRaw()`
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
    '<2.0.0': ['Database.identity', 'Model.identity', 'criteria', 'callback'],
    '>=2.0.0': ['criteria', 'callback']
  }
});
