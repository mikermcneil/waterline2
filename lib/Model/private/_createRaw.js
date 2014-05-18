/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Model._createRaw()`
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

module.exports = interpolate({
  method: 'create',
  usage: [
    {
      label: 'record',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'model identity', 'record', 'callback']
});
