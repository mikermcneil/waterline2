/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Relation.prototype._updateRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `update()`
 * method of an adapter directly, use `SomeModel.update().options({raw: true})`
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'update',
  usage: [
    {
      label: 'criteria',
      type: 'object'
    },
    {
      label: 'attrValues',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'criteria', 'attrValues', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'attrValues', 'callback']
  }
});
