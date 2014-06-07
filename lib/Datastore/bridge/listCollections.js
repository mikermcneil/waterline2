/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Datastore.listCollections()`
 *
 * List all physical collections in a datastore
 * (i.e. each of which might or might not map to a known WL relation)
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  method: 'listCollections',
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'callback']
  }
});
