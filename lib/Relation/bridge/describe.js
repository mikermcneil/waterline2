/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype.describe()`
 *
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'describe',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'callback']
  }
});
