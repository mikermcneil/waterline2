/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.addIndex()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
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
  adapterUsage: ['Database', 'index name', 'index definition', 'callback']
});
