/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Database.addIndex()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
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
    '>=2.0.0': ['Database', 'index name', 'index definition', 'callback']
  }
});
