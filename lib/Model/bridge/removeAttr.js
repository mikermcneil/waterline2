/**
 * Module dependencies
 */

var interpolate = require('../../Adapter/interpolate');


/**
 * `Model.removeAttr()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = interpolate({
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
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'attribute name', 'callback']
  }
});
