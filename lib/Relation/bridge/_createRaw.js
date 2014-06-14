/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype._createRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `create()`
 * method of an adapter directly, use `SomeModel.create().options({raw: true})`
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
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
  adapterMethod: 'create',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'attrValues', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'attrValues', 'callback']
  }
});
