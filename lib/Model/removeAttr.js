/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Model.removeAttr()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
  method: 'removeAttr',
  usage: [
    {
      label: 'attribute name',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterUsage: ['Database', 'Model', 'attribute name', 'callback']
});
