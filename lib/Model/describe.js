/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.describe()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
  method: 'describe',
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'Model', 'callback']
});
