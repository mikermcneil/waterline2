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
  usage: [
    {
      label: 'model cid',
      type: 'string'
    },
    {
      label: 'fields',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'define',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'fields', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'fields', 'callback']
  }
});
