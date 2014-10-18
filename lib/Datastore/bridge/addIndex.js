/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');

// TODO: move to model instead of datastore

/**
 * `Datastore.addIndex()`
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
      label: 'index definition',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'addIndex',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'model cid', 'index name', 'index definition', 'callback']
  }
});
