/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype.removeField()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  method: 'removeField',
  usage: [
    {
      label: 'field aid',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'field aid', 'callback']
  }
});
