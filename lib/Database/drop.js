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
  adapterUsage: {
    '<2.0.0': ['Database.identity', 'model identity', 'callback'],
    '>=2.0.0': ['model identity', 'callback']
  }
});
