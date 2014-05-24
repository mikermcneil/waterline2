/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Relation.prototype._createEachRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `createEach()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.create([{...}, {...}]).options({raw: true})
 * ```
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'createEach',
  usage: [
    {
      label: 'attrValues[]',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'attrValues[]', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'attrValues[]', 'callback']
  }
});
