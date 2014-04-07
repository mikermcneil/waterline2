/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.define()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
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
