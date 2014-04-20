/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Database.drop()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
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
