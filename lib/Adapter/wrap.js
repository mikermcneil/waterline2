
/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var RecordStream = require('../RecordStream');
var Deferred = require('../Deferred')();
var WLUsageError = require('../WLError/WLUsageError');
var WLError = require('../WLError');


//
// This Adapter utility is a module which builds a normalized
// wrapper for adapter methods to make them easily accessible
// from standard Waterline query semantics.
//

// e.g.
// _buildAdapterMethodWrapper({
//   method: 'describe',
//   usage: [
//     {
//       label: 'callback',
//       type: 'function',
//       optional: true
//     }
//   ],
//   adapterUsage: ['Database', 'Model', 'callback']
// });




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
      if (err) adapter.orm.emit('error', err);
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
  }
  if (!adapter[method]) {
    err = new WLUsageError({reason: util.format('`%s()` is not supported by this adapter (`%s`)', method, adapter.identity )});
    return err;
  }
  else return false;
}



/**
 * Contact adapter and perform specified `options.fn`.
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



/**
 * Closure function which builds a wrapper for
 * an Adapter method.  This exposes/normalizes the
 * method to end users via Waterline core by attaching
 * it to a Database or Model.
 *
 * @param  {Object} options
 * @return {Function}
 * @api private
 */
function _buildAdapterMethodWrapper(options) {

  var method = options.method;
  var usage = options.usage || [{
    optional: true,
    type: 'function',
    label: 'callback'
  }];

  /**
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
    var invalidUsage = _.any(args, function(arg, i) {
      var isCorrectType = typeof args[i] === usage[i].type;
      var isOptional = args[i] === undefined && usage[i].optional;
      if (!isCorrectType && !isOptional) {
        return true;
      }
      else return false;
    });
    if (invalidUsage) {
      return implicitCallback(new WLUsageError({reason: util.format('Invalid usage of `%s()`.  `%s` is invalid or missing', method, usage[i].label) }));
    }

    // Adapter usage
    var adapterUsage = options.adapterUsage || ['Database', _.pluck(usage.splice(usage.length-1), 'label')];
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

}



module.exports = _buildAdapterMethodWrapper;

