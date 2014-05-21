/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Datastore.removeIndex()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
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
