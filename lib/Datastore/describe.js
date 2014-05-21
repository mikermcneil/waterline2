/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Datastore.describe()`
 *
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'describe',
  usage: [
    {
      label: 'model cid',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'callback']
  }
});
