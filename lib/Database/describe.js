/**
 * Module dependencies
 */

var wrap = require('../Adapter/wrap');


/**
 * `Database.describe()`
 *
 * @return {Deferred}
 */

module.exports = wrap({
  method: 'describe',
  usage: [
    {
      label: 'model identity',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function'
    }
  ]
});
