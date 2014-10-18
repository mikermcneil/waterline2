/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Datastore.describe()`
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
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'describe',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'callback']
  }
});
