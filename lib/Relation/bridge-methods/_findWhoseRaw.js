/**
 * Module dependencies
 */

var Adapter = require('../../Adapter');


/**
 * `Relation.prototype._findWhoseRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `findWhose()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.find().where({
 *   someAssociation: {
 *     whose: {...}
 *   }
 * }).options({raw: true})
 * ```
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'criteria',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'findWhose',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});
