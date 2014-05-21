/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Database.removeIndex()`
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
    '>=2.0.0': ['Database', 'index name', 'callback']
  }
});
