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
