/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Model._findRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `find()`
 * method of an adapter directly, use `SomeModel.find().options({raw: true})`
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'find',
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
  adapterUsage: ['Database', 'Model', 'criteria', 'callback']
});
