/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Database.describe()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'describe',
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
