/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var _rewriteAdapterArguments = require('./rewrite-adapter-arguments');
var _whereVersionStringSatisfies = require('./where-version-string-satisfies');
var _normalizeImplicitCallback = require('./normalize-implicit-callback');
var _talkToAdapter = require('./talk-to-adapter');
var _isUnsupportedByAdapter = require('./is-unsupported');

var WLAdapterVersionError = require('./WLAdapterVersionError');

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
 * `fieldName` (i.e. columnName) and `cid` (i.e. tableName), and respects
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

  // Development-only-- assert correct usage of this function
  _assertions(spec,ctxOverride);

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
    var relation = ctx.getRelation && ctx.getRelation();

    // Interpret bridge arguments
    var args = Array.prototype.slice.call(arguments);
    var explicitCallback = _.last(args, _.isFunction)[0];

    // Get/build the callback that will be called in the code below.
    var implicitCallback = _normalizeImplicitCallback(adapter, explicitCallback);

    // The adapter must exist.
    if (!adapter) {
      return implicitCallback(new WLError(util.format('The `%s()` adapter method cannot be called because no adapter was specified', method)));
    }

    // Check the targeted `apiVersion` of the adapter to
    // determine which usage should be implemented.
    var adapterArgNames = _.find(adapterUsage, _whereVersionStringSatisfies(adapter.apiVersion), []);

    // Ensure Waterline supports the adapter's `apiVersion` for this method
    if (!adapterArgNames) {
      return implicitCallback(new WLAdapterVersionError({
        adapter: adapter,
        adapterUsage: adapterUsage
      }));
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
      return implicitCallback(new WLUsageError(util.format('Invalid usage of `%s()`.  `%s` is invalid or missing', method, invalidUsage.label)));
    }

    // Build arguments for the adapter method
    var adapterArgs = _rewriteAdapterArguments({
      runtimeArgs: args,
      datastore: datastore,
      relation: relation,
      usage: usage,
      adapterUsage: adapterArgNames
    });

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








// Validate required arguments
function _assertions (spec, ctxOverride) {
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
}

