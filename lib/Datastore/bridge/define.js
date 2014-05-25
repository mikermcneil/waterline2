/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Datastore.define()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
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
