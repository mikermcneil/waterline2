
/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var Deferred = require('../Deferred');
var WLUsageError = require('../WLError/WLUsageError');
var WLError = require('../WLError');



/**
 * #Adapter.interpolate()
 *
 * This module exports a static utility method, `Adapter.interpolate()`,
 * the purpose of which is to build a bridge between the
 * adapter interface (code in your adapter) and the standard,
 * user-space query semantics of Waterline (code in your app.)
 *
 * The resulting "bridge" function returns a Deferred, providing support
 * for `.exec()`, promises, streams, generators, switchbacks, etc.
 * It also takes care of normalizing/enforcing schema modifiers like
 * `columnName` and `tableName`, and respects global settings like
 * `compatibilityMode` which impact adapter usage.
 *
 *
 *
 * @param {Object} spec         will be used to validate usage of the bridge
 *                              method from userland, and to format the args
 *                              passed to the adapter.  Also specifies the
 *                              adapter method the bridge should communicate
 *                              with
 *
 * @param {Object} ctxOverride  optional override to use as the adapter method's
 *                              context instead of `this`
 *                              (should be an instance of `Database` or `Model`)
 *
 * @this  {Object}              will be used to bind the adapter method's context
 *                              (should be an instance of `Database` or `Model`)
 *
 * @return {Function}           bridge to an adapter method (i.e. wrapper function)
 *
 * @api private
 * @static
 *
 *
 * Example usage:
 * =============================================================================
 *
 * ```
 * var bridge = Adapter.interpolate({
 *   method: 'describe',
 *   usage: [
 *     {
 *       label: 'callback',
 *       type: 'function',
 *       optional: true
 *     }
 *   ],
 *   adapterUsage: ['Database', 'Model', 'callback']
 * }, SomeModel);
 * ```
 *
 * Then you can do: `SomeModel.bridge().exec(...)`
 */

module.exports = function interpolate (spec, ctxOverride) {

  assert(typeof spec === 'object', 'Invalid `spec` passed to `Adapter.interpolate()`');
  assert(ctxOverride === undefined || typeof ctxOverride === 'object', 'Invalid `ctxOverride` passed to `Adapter.interpolate()`');

  var method = spec.method;
  var usage = spec.usage || [{
    optional: true,
    type: 'function',
    label: 'callback'
  }];
  var adapterUsage = spec.adapterUsage || [
    'Database',
    _.pluck(usage.splice(usage.length-1), 'label')
  ];

  /**
   * TODO: more comments in this function (it's a little "dense"...)
   * @return {Deferred}
   */
  return function _methodWrapper ( /* ...., explicitCallback */ ) {

    // Look up the live Adapter instance for this Database/Model
    // and other related information
    var adapter = this.getAdapter();
    var database = this.getDatabase && this.getDatabase();
    var model = this.getModel && this.getModel();

    // Interpret arguments
    var args = Array.prototype.slice.call(arguments);
    var explicitCallback = _.last(args, _.isFunction)[0];

    var implicitCallback = _normalizeImplicitCallback(adapter, explicitCallback);
    var err = _isUnsupportedByAdapter(method, adapter);
    if (err) return implicitCallback(err);

    // Enforce valid usage
    var invalidUsage = _.reduce(args, function(invalid, arg, i) {
      var isCorrectType = typeof args[i] === usage[i].type;
      var isOptional = args[i] === undefined && usage[i].optional;
      if (!isCorrectType && !isOptional) {
        return usage[i];
      }
      else return invalid;
    }, null);
    if (invalidUsage) {
      return implicitCallback(new WLUsageError({reason: util.format('Invalid usage of `%s()`.  `%s` is invalid or missing', method, invalidUsage.label) }));
    }

    // Adapter usage
    var adapterArgs = _.reduce(adapterUsage, function (memo, usageArg, i) {

      // Special cases (Database/Model/callback)
      if (usageArg === 'Database' && database) {
        memo.push(database);
        return memo;
      }
      else if (usageArg === 'Model' && model) {
        memo.push(model);
        return memo;
      }

      // Don't send callback arg directly through- instead,
      // we'll provide the intercepted version later.
      // So skip it for now.
      else if (usageArg === 'callback') {
        return memo;
      }

      // Pass down arguments passed in to Waterline to the adapter
      var index = _.findIndex(usage, {label: usageArg});

      // Skip unmatched arguments (don't pass the down to the adapter)
      if (index !== -1 && args[index]) {
        memo.push(args[index]);
      }
      return memo;
    }, []);

    // Communiate with adapter and pass back response
    return _talkToAdapter({
      adapter: adapter,
      method: method,
      args: adapterArgs,
      callback: explicitCallback
    });
  };
};






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




/**
 * Normalize implicit/internal callback
 * (not what is publicly exposed to .exec())
 *
 * @param  {[type]}   adapter [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 * @api private
 */
function _normalizeImplicitCallback(adapter, cb) {
  if (!_.isFunction(cb)) {
    return function (err) {
      if (err) throw err;

      // TODO: emit error on ORM instead of throwing
      // if (err) adapter.orm.emit('error', err);
    };
  }
  else return cb;
}

/**
 * Check that the adapter supports the requested functionality:
 * @param  {[type]}   method  [description]
 * @param  {[type]}   adapter [description]
 * @return {Boolean}           [description]
 * @api private
 */
function _isUnsupportedByAdapter(method, adapter) {
  var err;
  if (!adapter) {
    err = new WLUsageError({reason: util.format('`%s()` can not be called because no adapter was specified.', method )});
    return err;
  }
  else if (!adapter[method]) {
    err = new WLUsageError({reason: util.format('`%s()` is not supported by this adapter (`%s`)', method, adapter.identity )});
    return err;
  }
  else return false;
}



/**
 * Contact adapter and perform specified `options.fn`.
 *
 * Build the Deferred object.
 *
 * @param  {Function}   options.fn
 * @param  {String}     options.method
 * @param  {Adapter}    options.adapter
 * @param  {Function}   options.callback
 * @return {Deferred}
 */
function _talkToAdapter (options) {


  // Instantiate a Deferred
  var deferred = new Deferred({
    type: options.method
  }, options.fn || function defaultFnToRunAdapterMethod (cb_from_adapter) {
    var _adapterMethod = options.adapter[options.method];
    var adapterArgs = options.args.concat([function adapterMethodCb ( /* err, results */ ) {
      var args = Array.prototype.slice.call(arguments);
      var err = args[0];
      if (err) return cb_from_adapter(new WLError(err));
      else return cb_from_adapter.apply(null, args);
    }]);
    var wrappedAdapterMethod = _.partial.apply(null, [_adapterMethod].concat(adapterArgs));
    // console.log(_adapterMethod.toString());
    // console.log(wrappedAdapterMethod.toString());
    // console.log('talk to adapter', adapterArgs);
    wrappedAdapterMethod();
  });

  // If `options.callback` (explicitCallback) was specified,
  // call `.exec()` on Deferred instance immediately.
  if (options.callback) {
    deferred.exec(options.callback);
  }
  return deferred;
}





