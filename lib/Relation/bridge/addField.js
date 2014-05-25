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
      label: 'new field aid',
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
    '>=2.0.0': ['Datastore', 'Model.cid', 'new field aid', 'field definition', 'callback']
  }
});
