/**
 * Module dependencies
 */

var interpolate = require('../Adapter/interpolate');


/**
 * `Model._findRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `find()`
 * method of an adapter directly, use `SomeModel.find().options({raw: true})`
 *
 * @type {Function}
 * @api private
 *
 * @param {?} * [usage specified declaratively below]
 * @return {Deferred}
 */

module.exports = interpolate({
  method: 'find',
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
  adapterUsage: ['Database', 'model identity', 'criteria', 'callback']
});


// some notes from how this used to work:
// // If `compatibilityMode` is enabled, use and expect
// // traditional WL1 adapter syntax.  Here, that means
// // calling `find` using the appropriate function signature.
// //
// // TODO: bring `compatibilityMode` stuff into `Adapter.interpolate()`
// // to help preserve separation of concerns and avoid repeating ourselves.
// if (self.orm.compatibilityMode) {

//   adapter.find(model.database, model.identity, operations, cb);

//   // TODO: delete this when everything's working and we're sure we won't need
//   // this log to play around with anymore.
//   // ||
//   // \/
//   //
//   // var interceptorFn = require('node-switchback')(function () {
//   //   console.log('Back from WL1 adapter:', arguments);
//   //   // In order to make: `_.partial(cb, a0, a1, a2, ...)`
//   //   // We have to do:
//   //   var composed_cb = _.partial.apply(null, [cb].concat(Array.prototype.slice.call(arguments)));
//   //   composed_cb();
//   // }, {invalid: 'error'});
//   // adapter.find(model.database, model.identity, operations, interceptorFn);

// }
// // TODO: replace with Adapter.interpolate() usage
// else adapter.find(operations, cb);
