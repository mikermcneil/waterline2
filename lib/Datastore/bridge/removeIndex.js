/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Datastore.removeIndex()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  method: 'removeIndex',
  usage: [
    {
      label: 'index name',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'index name', 'callback']
  }
});
