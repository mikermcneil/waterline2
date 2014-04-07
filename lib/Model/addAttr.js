/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Model.addAttr()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
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
  adapterUsage: ['Database', 'Model', 'attribute name', 'attribute definition', 'callback']
});
