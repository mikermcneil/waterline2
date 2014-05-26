/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype.addField()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  method: 'addField',
  usage: [
    {
      label: 'fieldName',
      type: 'string'
    },
    {
      label: 'field definition',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'fieldName', 'field definition', 'callback']
  }
});
