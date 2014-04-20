/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Database.define()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'define',
  usage: [
    {
      label: 'model identity',
      type: 'string'
    },
    {
      label: 'attributes',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'model identity', 'attributes', 'callback']
});
