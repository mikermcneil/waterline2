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
  usage: [
    {
      label: 'fieldName',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'removeField',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'fieldName', 'callback']
  }
});
