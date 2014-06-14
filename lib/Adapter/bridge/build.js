/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var _rewriteAdapterArguments = require('./rewrite-adapter-arguments');
var _whereVersionStringSatisfies = require('./where-version-string-satisfies');
var _normalizeImplicitCallback = require('./normalize-implicit-callback');
var _talkToAdapter = require('./talk-to-adapter');
var _ifIsUnsupportedByAdapter = require('./if-is-unsupported');
var _ifHasUsageError = require('./if-has-usage-error');
var WLAdapterVersionError = require('./WLAdapterVersionError');

var Deferred = require('root-require')('standalone/Deferred');
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

  // Default properties for `adapterResults`
  spec.adapterResults = _.defaults(spec.adapterResults||{}, {
    type: '*'
  });

  // Normalize usage
  spec.usage = _.map(spec.usage || [{
    type: 'function',
    label: 'callback'
  }], function (def) {
    // Unless otherwise specified, a `callback` should be optional.
    // It is not necessary to provide a default, since it will be interpolated
    // with a Deferred worker function.
    if (def.label === 'callback' && def.optional === undefined) {
      def.optional = true;
    }
    // Unless otherwise specified, a `criteria` should be optional and default to a normalized object
    else if (def.label === 'criteria' && (def.optional===true||def.optional===undefined) && def.defaultsTo === undefined) {
      def.defaultsTo = {
        where: {},
        select: {
          '*': true
        },
        limit: undefined,
        skip: undefined,
        sort: {}
      };
    }
    return def;
  });

  // Configure the bridge method by defining variables in closure scope:
  var method = spec.method;
  var usage = spec.usage;
  var adapterUsageByVersion = spec.adapterUsage;



  /**
   * `_bridge()`
   *
   * Wrapper for the actual bridge method (i.e. called at runtime)
   *
   * TODO: (optimize) pull more stuff out of this function and into the section above to reduce the LoC we're executing in each query at runtime.
   *
   * @return {Deferred}
   */
  return function _bridge ( /* ...., explicitCallback */ ) {

    var ctx = ctxOverride||this;

    if ( !ctx || !ctx.getAdapter ) {
      throw WLError('Cannot call bridge method - invalid context (expecting `this.getAdapter() to exist`. Context: '+util.inspect(ctx, false, null));
    }

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
    var adapterArgNames = _.find(adapterUsageByVersion, _whereVersionStringSatisfies(adapter.apiVersion));

    // Ensure Waterline supports the adapter's `apiVersion` for this method
    if (!adapterArgNames) {
      return implicitCallback(new WLAdapterVersionError({
        adapter: adapter,
        adapterUsage: adapterUsageByVersion
      }));
    }

    // Ensure the adapter has the requested method
    if (_ifIsUnsupportedByAdapter(method, adapter)) {
      return implicitCallback(_ifIsUnsupportedByAdapter(method, adapter));
    }

    // Enforce bridge usage at runtime
    var usageError = _ifHasUsageError({
      usage: usage,
      runtimeArgs: args,
      method: method,
      relation: relation,
      datastore: datastore
    });
    if (usageError) return implicitCallback(usageError);

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
      adapterResults: spec.adapterResults,
      method: method,
      args: adapterArgs,
      callback: explicitCallback,
      Switchback: ctx.orm && ctx.orm.Switchback,
      orm: ctx.orm
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

