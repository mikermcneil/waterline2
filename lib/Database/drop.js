/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.drop()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
  method: 'drop',
  usage: [
    {
      label: 'model identity',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'model identity', 'callback']
});
