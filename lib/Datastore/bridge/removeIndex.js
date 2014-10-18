/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');

// TODO: move to model instead of datastore

/**
 * `Datastore.removeIndex()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
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
  adapterMethod: 'removeIndex',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'index name', 'callback']
  }
});
