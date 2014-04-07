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
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'Model', 'callback']
});
