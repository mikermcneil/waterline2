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
      label: 'model cid',
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
  adapterUsage: {
    '<2.0.0': ['Database.identity', 'model cid', 'attributes', 'callback'],
    '>=2.0.0': ['Database', 'model cid', 'attributes', 'callback']
  }
});
