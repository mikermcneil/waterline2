/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Relational.prototype.addAttr()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'addAttr',
  usage: [
    {
      label: 'attribute name',
      type: 'string'
    },
    {
      label: 'attribute definition',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'attribute name', 'attribute definition', 'callback']
  }
});
