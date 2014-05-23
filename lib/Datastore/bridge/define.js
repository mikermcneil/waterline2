/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Datastore.define()`
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
    '<2.0.0': ['Datastore.identity', 'model cid', 'attributes', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'attributes', 'callback']
  }
});
