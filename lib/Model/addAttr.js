/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Model.addAttr()`
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
    '>=2.0.0': ['Database', 'Model.cid', 'attribute name', 'attribute definition', 'callback']
  }
});
