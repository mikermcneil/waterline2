/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Model.describe()`
 *
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'describe',
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '<2.0.0': ['Database.identity', 'Model.cid', 'callback'],
    '>=2.0.0': ['Database', 'Model.cid', 'callback']
  }
});
