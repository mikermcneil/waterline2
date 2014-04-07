/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.removeIndex()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
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
  adapterUsage: ['Database', 'index name', 'callback']
});
