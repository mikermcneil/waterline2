/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype.drop()`
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
  adapterMethod: 'drop',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'callback']
  }
});
