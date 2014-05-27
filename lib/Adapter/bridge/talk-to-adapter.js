/**
 * Module dependencies
 */

var _ = require('lodash');

var Deferred = require('root-require')('standalone/Deferred');
var WLError = require('root-require')('standalone/WLError');


/**
 * Contact adapter and perform specified `options.fn`.
 *
 * Build the Deferred object.
 *
 * @option  {Function}   options.fn
 * @option  {String}     options.method
 * @option  {Adapter}    options.adapter
 * @option  {Function}   options.callback
 * @option  {Function}   options.Switchback
 * @return {Deferred}
 */

module.exports = function _talkToAdapter (options) {


  // Instantiate a Deferred
  var deferred = new Deferred({
    type: options.method,
    Switchback: options.Switchback
  }, options.fn || function defaultFnToRunAdapterMethod (cb_from_adapter) {
    var _adapterMethod = options.adapter[options.method];

    // Interceptor method to ensure that all adapter errors are transformed
    // into WLError instances.
    var adapterMethodCb = function adapterMethodCb ( /* err, results */ ) {
      var args = Array.prototype.slice.call(arguments);
      var err = args[0];
      if (err) return cb_from_adapter(new WLError(err));
      else return cb_from_adapter.apply(null, args);
    };

    // "Switchbackify" the interceptor callback, if a `Switchback` factory was passed in
    if (options.Switchback) {
      adapterMethodCb = options.Switchback(adapterMethodCb, {invalid: 'error'});
    }

    var adapterArgs = options.args.concat([adapterMethodCb]);
    var wrappedAdapterMethod = _.partial.apply(null, [_adapterMethod].concat(adapterArgs));
    // console.log(_adapterMethod.toString());
    // console.log(wrappedAdapterMethod.toString());
    // console.log('passed arguments to adapter: ', util.inspect(adapterArgs,false,null));
    wrappedAdapterMethod();
  });

  // If `options.callback` (explicitCallback) was specified,
  // call `.exec()` on Deferred instance immediately.
  if (options.callback) {
    deferred.exec(options.callback);
  }
  return deferred;
};
