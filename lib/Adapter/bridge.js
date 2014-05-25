
/**
 * Module dependencies
 */

var util = require('util');
var semver = require('semver');
var _ = require('lodash');

var Deferred = require('root-require')('standalone/Deferred');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var WLError = require('root-require')('standalone/WLError');




/**
 * #Adapter.bridge()
 *
 * This module exports a static utility method, `Adapter.bridge()`,
 * the purpose of which is to build a bridge between the
 * adapter interface (code in your adapter) and the standard,
 * user-space query semantics of Waterline (code in your app.)
 *
 * The resulting "bridge" function returns a Deferred, providing support
 * for `.exec()`, promises, streams, generators, switchbacks, etc.
 * It also takes care of normalizing/enforcing schema modifiers like
 * `aid` (i.e. columnName) and `cid` (i.e. tableName), and respects
 * global settings like `compatibilityMode`, the adapter's `apiVersion` and
 * any other configuration which impacts adapter usage.
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
 *                              (should be an instance of `Datastore` or `Relation`)
 *
 * @this  {Object}              will be used to bind the adapter method's context
 *                              in the absence of `ctxOverride`
 *                              (should be an instance of `Datastore` or `Relation`)
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
 * var bridge = Adapter.bridge({
 *   method: 'describe',
 *   usage: [
 *     {
 *       label: 'callback',
 *       type: 'function',
 *       optional: true
 *     }
 *   ],
 *   adapterUsage: {
 *     '*': ['Datastore', 'Model', 'callback']
 * }, SomeRelation);
 * ```
 *
 * Then you can do: `bridge().exec(...)`
 */

module.exports = function bridge (spec, ctxOverride) {

  // Assertions
  require('assert')(
    typeof spec === 'object',
    'Invalid `spec` passed to `Adapter.bridge()`'
  );
  require('assert')(
    ctxOverride === undefined || typeof ctxOverride === 'object',
    'Invalid `ctxOverride` passed to `Adapter.bridge()`'
  );
  require('assert')(
    typeof spec.method === 'string',
    'Invalid `spec.method` ("'+spec.method+'") passed to `Adapter.bridge()`- should have been the name of an adapter method, like "find" or "create"'
  );

  // Configure the bridge method by defining variables in closure scope:
  var method = spec.method;
  var usage = spec.usage || [{
    optional: true,
    type: 'function',
    label: 'callback'
  }];
  var adapterUsage = spec.adapterUsage;


  /**
   * `_bridge()`
   *
   * The actual bridge method.
   *
   * TODO: (optimize) pull more stuff out of this function and into the section above to reduce the LoC we're executing in each query at runtime.
   *
   * @return {Deferred}
   */
  return function _bridge ( /* ...., explicitCallback */ ) {

    var ctx = ctxOverride||this;

    // Look up the live Adapter, Model, and Datastore instances
    var adapter = ctx.getAdapter();
    var datastore = ctx.getDatastore && ctx.getDatastore();
    var model = ctx.getModel && ctx.getModel();

    // Interpret bridge arguments
    var args = Array.prototype.slice.call(arguments);
    var explicitCallback = _.last(args, _.isFunction)[0];

    // Get/build the callback that will be called in the code below.
    var implicitCallback = _normalizeImplicitCallback(adapter, explicitCallback);

    // The adapter must exist.
    if (!adapter) {
      return implicitCallback(new WLUsageError({reason: util.format('The `%s()` adapter method cannot be called because no adapter was specified', method )}));
    }

    // Check the targeted `apiVersion` of the adapter to
    // determine which usage should be implemented.
    var adapterArgNames = _.find(adapterUsage, function (adapterArgs, versionString) {
      if (semver.satisfies(adapter.apiVersion, versionString)) {
        return adapterArgs;
      }
    }, []);

    // Ensure Waterline supports the adapter's `apiVersion` for this method
    if (!adapterArgNames) {
      return implicitCallback(new WLUsageError(util.format(
        'The adapter (`%s`) implements `apiVersion` "%s"'+
        '\n'+
        'But to use the `%s()` method, the adapter\'s `apiVersion` must match one of the following known semver strings:'+
        '\n'+
        _.reduce(adapterUsage, function (memo, adapterArgs, versionString) {return memo+'• '+versionString+'\n';}, '') +
        '\n'+
        '(tip: the `apiVersion` for an adapter is always "0.0.0" unless otherwise specified)',
        adapter.identity, adapter.apiVersion, method)));
    }

    // Ensure the adapter has the requested method
    if (_isUnsupportedByAdapter(method, adapter)) {
      return implicitCallback(_isUnsupportedByAdapter(method, adapter));
    }

    // Enforce bridge usage at runtime
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

    // Build arguments for the adapter method
    var adapterArgs = _.reduce(adapterArgNames, function (memo, adapterUsageArg, i) {

      // If an argument with the same name from the bridge usage
      // exists, pass it down as an argument to adapter in the appopriate
      // position.
      var indexInBridgeUsage = _.findIndex(usage, {label: adapterUsageArg});
      var matchingRuntimeArg;
      var hasMatchingRuntimeArg;
      if (indexInBridgeUsage !== -1) {
        matchingRuntimeArg = args[indexInBridgeUsage];
        hasMatchingRuntimeArg = true;
      }

      // Handle a few special cases- argument names which have some
      // prescribed meaning.
      switch (adapterUsageArg) {

        // Pass the Datastore instance down to the adapter
        case 'Datastore':
          memo.push(datastore);
          return memo;

        // Pass the datastore's identity down to the adapter
        case 'Datastore.identity':
          memo.push(datastore.identity);
          return memo;

        // Pass the Model instance down to the adapter
        case 'Model':
          memo.push(model);
          return memo;

        // Pass the model's identity down to the adapter
        case 'Model.identity':
          memo.push(model.identity);
          return memo;

        // Pass the model's "table name" or "cid" down to the adapter
        // (not just for tables-- also Mongo/Redis collections, etc.)
        case 'Model.cid':
          memo.push(model.cid);
          return memo;

        // Skip the "callback" argument entirely for now.
        // Instead, we'll provide our own, intercepted version of it later.
        case 'callback':
          return memo;


        // Handle special cases for criteria and attrValues objects
        // Takes care of mapping `aid` (i.e. columnName)
        case 'criteria':
          if (hasMatchingRuntimeArg) {

            // If model is unknown, this must be some other kind of "criteria"
            if (!model) {
              memo.push(matchingRuntimeArg);
              return memo;
            }

            // || TODO:
            // \/ determine whether this needs to be recursive

            // Map criteria keys, replacing `attrName` with the appropriate `aid` (i.e. columnName)
            var pCriteria = _.cloneDeep(matchingRuntimeArg);
            pCriteria.where = _.reduce(pCriteria.where, function (memo, subCriteria, attrName) {
              var attrDef = model.attributes[attrName];

              // If attribute is in the model's logical schema, use its `aid`
              // otherwise leave it alone
              memo[attrDef ? attrDef.aid : attrName] = subCriteria;
              return memo;
            }, {});

            memo.push(pCriteria);
          }
          return memo;

        case 'attrValues':
          if (hasMatchingRuntimeArg) {

            // || TODO:
            // \/ determine whether this needs to be recursive

            throw new Error('aid mapping for `attrValues` not implemented yet');
            // var pAttrValues = _.cloneDeep(matchingRuntimeArg);
            // memo.push(pAttrValues);
          }
          return memo;

        case 'attrValues[]':
          if (hasMatchingRuntimeArg) {

            // || TODO:
            // \/ determine whether this needs to be recursive

            throw new Error('aid mapping for `attrValues[]` not implemented yet');
            // var pAttrValuesArray = _.cloneDeep(matchingRuntimeArg);
            // memo.push(pAttrValuesArray);
          }
          return memo;

        // Otherwise...
        default:
          // Skip unmatched arguments (don't pass them down to the adapter)
          // Otherwise, pass all arguments down to adapter
          if (matchingRuntimeArg) {
            memo.push(matchingRuntimeArg);
          }
          return memo;
      }

    }, []);

    // Communicate with adapter and pass back response
    return _talkToAdapter({
      adapter: adapter,
      method: method,
      args: adapterArgs,
      callback: explicitCallback,
      Switchback: ctx.orm && ctx.orm.Switchback
    });
  };
};




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
      if (err) {
        if (adapter && adapter.orm) {
          // TODO: emit error on ORM instead of throwing
          throw err;
          // adapter.orm.emit('error', err);
        }
        else throw err;
      }
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
  if (!adapter[method]) {
    err = new WLUsageError({reason: util.format('The `%s()` method is not supported by this adapter (`%s`)', method, adapter.identity )});
    return err;
  }
  else return false;
}



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
function _talkToAdapter (options) {


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
}





