/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Datastore.addIndex()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  method: 'addIndex',
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
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'index name', 'index definition', 'callback']
  }
});
