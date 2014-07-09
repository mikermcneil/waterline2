!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Waterline=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = _dereq_('./lib/Waterline');

},{"./lib/Waterline":88}],2:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');

var prettyInstance = _dereq_('root-require')('standalone/pretty-instance');



/**
 * Consruct an Adapter.
 *
 * Mostly a noop, this takes an adapter definition object
 * and constructs an Adapter instance based on it.
 *
 * Currently, the new instance and the adapter definition object
 * are more or less exactly the same thing.
 *
 * @param  {Object} definition
 * @constructor
 */
function Adapter ( definition ) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  _.merge(this, definition || {});

  // Ensure `apiVersion` string exists-- if not, default to "0.0.0"
  this.apiVersion = this.apiVersion || '0.0.0';
}


// Return a context-dependent (i.e. "this"-dependent) bridge method based on
// the provided `spec` and context (`this`, or `ctxOverride`)
Adapter.bridge = _dereq_('./bridge');

// Qualifier
Adapter.isAdapter = _dereq_('root-require')('standalone/WLEntity').qualifier;


Adapter.prototype.refresh = function () {
  // This is a no-op.
};

// Presentation
Adapter.prototype.inspect = function () {
  return prettyInstance(this, undefined, 'Adapter <'+this.identity+'>');
};


module.exports = Adapter;

},{"./bridge":7,"lodash":90,"root-require":99}],3:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');

var WLError = _dereq_('root-require')('standalone/WLError');


/**
 * Construct a WLAdapterVersionError.
 *
 * @required {Adapter} properties.adapter
 * @required {Array} properties.adapterUsage
 */

function WLAdapterVersionError(properties) {

  // Set `reason`
  this.reason = util.format(
    'The adapter (`%s`) implements `apiVersion` "%s"'+
    '\n'+
    'But to use the `%s()` method, the adapter\'s `apiVersion` must match one of the following known semver strings:'+
    '\n'+
    _.reduce(adapterUsage, function (memo, adapterArgs, versionString) {return memo+'• '+versionString+'\n';}, '') +
    '\n'+
    '(tip: the `apiVersion` for an adapter is always "0.0.0" unless otherwise specified)',
    adapter.identity, adapter.apiVersion, method
  );

  // Call superclass
  WLAdapterVersionError.super_.call(this, properties);
}

util.inherits(WLAdapterVersionError, WLError);



// Default properties
WLAdapterVersionError.prototype.code =
'E_ADAPTER';
WLAdapterVersionError.prototype.reason =
'Encountered an error with one of your configured adapters';
WLAdapterVersionError.prototype.details =
'';

module.exports = WLAdapterVersionError;

},{"lodash":90,"root-require":99,"util":131}],4:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');

var _rewriteAdapterArguments = _dereq_('./rewrite-adapter-arguments');
var _whereVersionStringSatisfies = _dereq_('./where-version-string-satisfies');
var _normalizeImplicitCallback = _dereq_('./normalize-implicit-callback');
var _talkToAdapter = _dereq_('./talk-to-adapter');
var _ifIsUnsupportedByAdapter = _dereq_('./if-is-unsupported');
var _ifHasUsageError = _dereq_('./if-has-usage-error');
var WLAdapterVersionError = _dereq_('./WLAdapterVersionError');

var Deferred = _dereq_('root-require')('standalone/Deferred');
var WLError = _dereq_('root-require')('standalone/WLError');




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
 *                              `adapterMethod` the bridge should communicate
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
 *   usage: [
 *     {
 *       label: 'callback',
 *       type: 'function',
 *       optional: true
 *     }
 *   ],
 *   adapterMethod: 'describe',
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
  var method = spec.adapterMethod;
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
  _dereq_('assert')(
    typeof spec === 'object',
    'Invalid `spec` passed to `Adapter.bridge()`'
  );
  _dereq_('assert')(
    ctxOverride === undefined || typeof ctxOverride === 'object',
    'Invalid `ctxOverride` passed to `Adapter.bridge()`'
  );
  _dereq_('assert')(
    typeof (spec.adapterMethod) === 'string',
    'Invalid `spec.adapterMethod` ("'+spec.adapterMethod+'") passed to `Adapter.bridge()`- should have been the name of an adapter method, like "find" or "create"'
  );
}


},{"./WLAdapterVersionError":3,"./if-has-usage-error":5,"./if-is-unsupported":6,"./normalize-implicit-callback":8,"./rewrite-adapter-arguments":9,"./talk-to-adapter":10,"./where-version-string-satisfies":11,"assert":123,"lodash":90,"root-require":99,"util":131}],5:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');

var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');


/**
 * _ifHasUsageError()
 *
 * @required {Object} opts.usage
 * @required {Array}  opts.runtimeArgs
 * @required {String} opts.method
 * @optional {Relation} opts.relation
 * @required {Datastore} opts.datastore
 *
 * @return {WLUsageError} [or `null` if everything is cool]
 */

module.exports = function _ifHasUsageError(opts) {

  // console.log('validating runtimeargs',opts.runtimeArgs,'against usage',opts.usage);

  var invalidUsage = _.reduce(opts.usage, function(invalid, def, i) {
    var isCorrectType = typeof opts.runtimeArgs[i] === opts.usage[i].type;
    var isOptional = !!(opts.runtimeArgs[i] === undefined && (opts.usage[i].optional||opts.usage[i].defaultsTo));
    var hasDefault = !!(opts.usage[i].defaultsTo);

    // console.log('   •',def.label,': isOptional?',isOptional, 'hasDefault?', hasDefault);

    // If runtime arg is an unexpected type, and the arg is not optional, this is an error
    if (!isCorrectType && !isOptional) {
      return opts.usage[i];
    }
    // If runtime arg is invalid, but the arg is optional
    // AND no default value is specified, then this is an error.
    // (unless the usage is labeled 'callback', in which case it's ok)
    else if (!isCorrectType && isOptional && !hasDefault && opts.usage[i].label !== 'callback') {
      return opts.usage[i];
    }
    else return invalid;
  }, null);

  if (invalidUsage) {
    return new WLUsageError(util.format('Called `%s.%s()` with invalid usage for argument `%s`', (opts.relation||opts.datastore).identity, opts.method, invalidUsage.label));
  }
  else return null;
};

},{"lodash":90,"root-require":99,"util":131}],6:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');

var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');



/**
 * Check that the adapter supports the requested functionality:
 * @param  {[type]}   method  [description]
 * @param  {[type]}   adapter [description]
 * @return {Boolean}           [description]
 * @api private
 */
module.exports = function _ifIsUnsupportedByAdapter(method, adapter) {
  var err;
  if (!adapter[method]) {
    err = new WLUsageError({reason: util.format('The `%s()` method is not supported by this adapter (`%s`)', method, adapter.identity )});
    return err;
  }
  else return false;
};



},{"root-require":99,"util":131}],7:[function(_dereq_,module,exports){
module.exports = _dereq_('./build');

},{"./build":4}],8:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');



/**
 * Normalize implicit/internal callback
 * (not what is publicly exposed to .exec())
 *
 * @param  {[type]}   adapter [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 * @api private
 */
module.exports = function _normalizeImplicitCallback(adapter, cb) {
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
};

},{"lodash":90}],9:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');


/**
 * _rewriteAdapterArguments()
 *
 * @param {Object} opts
 *       @optional  .datastore    {Datastore}
 *       @optional  .relation     {Relation}
 *       @required  .runtimeArgs  {Array}
 *       @required  .usage        {Object}
 *       @required  .adapterUsage {Array}
 *
 * @return {Array}
 */

module.exports = function _rewriteAdapterArguments(opts) {
  // log.skip(opts);
  return _.reduce(opts.adapterUsage, _toRewriteArgument(opts), []);
};



function _toRewriteArgument (opts) {


  /**
   * Map the keys of a subclause (like `where`, `select`, or `sort`)
   * from logical attribute names to their physical-layer `fieldName`
   * equivalents (called from a `_.reduce()`)
   *
   * @param  {[type]} memo     [description]
   * @param  {[type]} sub      [description]
   * @param  {[type]} attrName [description]
   * @return {[type]}          [description]
   */
  function mapToPhysicalSchema (memo, sub, attrName) {
    var attrDef = opts.relation.attributes[attrName];
    // console.log('in '+opts.relation.identity+', mapped "',attrName,'" to physical schema');
    // console.log('subselect:', sub);
    // console.log('attrDef:', attrDef);

    // If the specified `attrName` is NOT in the schema, just copy it over as-is.
    if (!attrDef) {
      memo[attrName] = sub;
      return memo;
    }

    // If attribute is in the relation's logical schema, use its `fieldName`
    // otherwise leave it alone
    memo[attrDef.fieldName||attrName] = sub;
    // log.skip('mapping '+attrName+' to',attrDef.fieldName||attrName, '-->',attrDef ? attrDef.fieldName : attrName, ':::',subCriteria);
    return memo;
  }


  /**
   * Called by `_.reduce()` for each argument in this bridge method's
   * `adapterUsage` configuration.
   *
   * @param  {[type]} memo            [description]
   * @param  {[type]} adapterUsageArg [description]
   * @param  {[type]} i               [description]
   * @return {[type]}                 [description]
   */

  return function _rewriteArgument (memo, adapterUsageArg, i) {

    // If an argument with the same name from the bridge usage
    // exists, pass it down as an argument to adapter in the appropriate
    // position.
    var indexInBridgeUsage = _.findIndex(opts.usage, {label: adapterUsageArg});
    var usageDetailsForThisArg = _.find(opts.usage, {label: adapterUsageArg});
    var matchingRuntimeArg;
    if (indexInBridgeUsage !== -1) {
      matchingRuntimeArg = opts.runtimeArgs[indexInBridgeUsage];
      if (!matchingRuntimeArg) {
        matchingRuntimeArg = usageDetailsForThisArg.defaultsTo||undefined;
      }
    }

    // log.skip('arg:',adapterUsageArg);
    // log.skip('matchingRuntimeArg:',matchingRuntimeArg);
    // log.skip('indexInBridgeUsage:',indexInBridgeUsage);
    // log.skip('all runtime args:', opts.runtimeArgs);

    // Handle a few special cases- argument names which have some
    // prescribed meaning.
    switch (adapterUsageArg) {

      // Pass the Datastore instance down to the adapter
      case 'Datastore':
        memo.push(opts.datastore);
        return memo;

      // Pass the datastore's identity down to the adapter
      case 'Datastore.identity':
        memo.push(opts.datastore.identity);
        return memo;

      // Pass the Relation instance (whether it's a Model OR Junction) down to the adapter
      case 'Relation':
      case 'Junction':
      case 'Model':
        memo.push(opts.relation);
        return memo;

      // Pass the relation's identity down to the adapter
      case 'Relation.identity':
      case 'Junction.identity':
      case 'Model.identity':
        memo.push(opts.relation.identity);
        return memo;

      // Pass the relation's "table name" or "cid" down to the adapter
      // (not just for tables-- also Mongo/Redis collections, etc.)
      case 'Relation.cid':
      case 'Junction.cid':
      case 'Model.cid':
        // log.skip('pushing relation cid ('+opts.relation.cid+') from ',opts.relation);
        memo.push(opts.relation.cid);
        return memo;

      // Skip the "callback" argument entirely for now.
      // Instead, we'll provide our own, intercepted version of it later.
      case 'callback':
        return memo;


      // Handle special cases for criteria and attrValues objects
      // Takes care of mapping `fieldName` (i.e. columnName)
      case 'criteria':

        // If relation is unknown, this must be some other kind of "criteria"
        if (!opts.relation) {
          memo.push(matchingRuntimeArg);
          return memo;
        }

        // Map criteria keys, replacing `attrName` with the appropriate `fieldName` (i.e. columnName)
        var physicalCriteria = _.cloneDeep(matchingRuntimeArg);
        // console.log('criteria.select (in rewrite-a-args) ::',physicalCriteria.select);
        physicalCriteria.where = _.reduce(physicalCriteria.where, mapToPhysicalSchema, {});
        physicalCriteria.select = _.reduce(physicalCriteria.select, mapToPhysicalSchema, {'*': true});
        physicalCriteria.sort = _.reduce(physicalCriteria.sort, mapToPhysicalSchema, {});

        // If no `from` was provided, build it on the fly using `opts.relation`
        //
        // NOTE:
        // `from.identity` IS NOT THE SAME THING AS THE `cid`!!!
        physicalCriteria.from = physicalCriteria.from || {
          entity: opts.relation.entity,
          identity: opts.relation.identity
        };





        // console.log('physicalCriteria.select (in rewrite-a-args) ::',physicalCriteria.select);

        // Omit "SELECT" from criteria passed to adapter for now
        // delete physicalCriteria.select;

        memo.push(physicalCriteria);

        return memo;

      case 'attrValues':
        // || TODO:
        // \/ determine whether this needs to be recursive

        throw new Error('fieldName mapping for `attrValues` not implemented yet');

        // Map keys, replacing `attrName` with the appropriate `fieldName` (i.e. columnName)
        // var physicalVector = _.cloneDeep(matchingRuntimeArg);
        // physicalVector = _.reduce(physicalVector, mapToPhysicalSchema, {});
        // memo.push(physicalVector);
        // return memo;

      case 'attrValues[]':
        // || TODO:
        // \/ determine whether this needs to be recursive

        throw new Error('fieldName mapping for `attrValues[]` not implemented yet');

        // Map keys, replacing `attrName` with the appropriate `fieldName` (i.e. columnName)
        // var physicalVector = _.cloneDeep(matchingRuntimeArg);
        // physicalVector = _.reduce(physicalVector, mapToPhysicalSchema, {});
        // memo.push(physicalVector);
        // return memo;

      // Otherwise...
      default:
        // Skip unmatched arguments (don't pass them down to the adapter)
        // Otherwise, pass all arguments down to adapter
        if (matchingRuntimeArg) {
          memo.push(matchingRuntimeArg);
        }
        return memo;
    }

  };
}


},{"lodash":90}],10:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');

var Deferred = _dereq_('root-require')('standalone/Deferred');
var WLError = _dereq_('root-require')('standalone/WLError');
var lookupRelationFrom = _dereq_('root-require')('standalone/lookup-relation-from');

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
 * @option  {ORM}   options.orm
 * @return {Deferred}
 */

module.exports = function _talkToAdapter(options) {


  // Instantiate a Deferred
  var deferred = new Deferred({
    type: options.method,
    Switchback: options.Switchback
  }, options.fn || function defaultFnToRunAdapterMethod(cb_from_adapter) {
    var _adapterMethod = options.adapter[options.method];

    // Interceptor method to ensure that all adapter errors are transformed
    // into WLError instances.
    var adapterMethodCb = function adapterMethodCb( /* err, results */ ) {
      var args = Array.prototype.slice.call(arguments);
      var err = args[0];

      // Normalize output from adapter
      args[1] = _normalizeAdapterOutput(args[1], options);

      if (err) return cb_from_adapter(new WLError(err));
      else return cb_from_adapter.apply(null, args);
    };

    // "Switchbackify" the interceptor callback, if a `Switchback` factory was passed in
    // (this is so that adapters themselves may call `cb.invalid()`, etc.)
    if (options.Switchback) {
      adapterMethodCb = options.Switchback(adapterMethodCb, {
        invalid: 'error'
      });
    }


    var adapterArgs = options.args.concat([adapterMethodCb]);
    var wrappedAdapterMethod = _.partial.apply(null, [_adapterMethod].concat(adapterArgs));
    // console.log(_adapterMethod.toString());
    // console.log(wrappedAdapterMethod.toString());
    // console.log('****-----> passed arguments to adapter: ', util.inspect(adapterArgs,false,null));
    wrappedAdapterMethod();
  });

  // If `options.callback` (explicitCallback) was specified,
  // call `.exec()` on Deferred instance immediately.
  if (options.callback) {
    deferred.exec(options.callback);
  }
  return deferred;
};


/**
 * Tolerate unexpected results from adapter
 * (and map `fieldName` keys in results to the logical `attrName`s in schema)
 *
 * @param  {[type]} adapterOutput [description]
 * @param  {[type]} options            [description]
 * @return {[type]}                [description]
 */
function _normalizeAdapterOutput(adapterOutput, options) {
  var orm = options.orm;
  // console.log('output from adapter:',adapterOutput);

  // TODO: remove the check which looks at the name of the method directly
  // in favor of the new, more explicit strategy of examining `spec.adapterResults`
  // on the bridge method definition (this handles the case of create, update, destroy,
  // etc. as well as allowing us flexibility for future methods + plugins)
  var ifResultsAreRecords = options.method === 'find' || (
    options.adapterResults && options.adapterResults.type === 'attrValues[]'
  );

  // This is also where we map fieldNames to actual logical attributes
  var criteria = options.args[2];
  if (orm && criteria && criteria.from && ifResultsAreRecords) {

    ////////////////////////////////////////////////////////////////////////////
    // WL1 Compatibility:
    //
    // If this is a `find()`, normalize results from adapter fn
    // to support WL1 (this backwards-compatibility measure is
    // only applied if ORM is specified and in compatibilityMode)
    if (options.method === 'find') {
      if (!_.isArray(adapterOutput)) {

        // To support WL1 core, if the result looks like a record,
        // just wrap it and treat it as a single-item array.
        // (e.g. this is a `findOne()` and it somehow got snipped)
        //
        // This can probably be removed in the future.
        if (orm && orm.compatibilityMode && _.isObject(adapterOutput)) {
          adapterOutput = [adapterOutput];
        } else {
          // TODO: log warning that an unexpected result was returned, along with
          // the name of the adapter, the datastore, the model, and the criteria in
          // the query that triggered the issue (as well as the fact that this was
          // a "find()" query.)
          if (orm) {
            orm.emit('warn', 'Received unexpected result from adapter in find(): ' + util.inspect(adapterOutput));
          }
          adapterOutput = [];
        }
      }
    }
    ////////////////////////////////////////////////////////////////////////////


    var relation = lookupRelationFrom(criteria.from, orm);
    if (relation) {
      // console.log('in '+relation.identity+', mapping from physical->logical schema');
      // console.log('subselect:', sub);
      // console.log('attrDef:', attrDef);

      adapterOutput = _.map(adapterOutput, function(record) {
        return _.reduce(record, function(memo, attrVal, attrKey) {
          // console.log('mapping '+attrKey);

          // Look for a fieldName which matches attrKey in schema:
          var attrName;
          var attrDef = _.find(relation.attributes, function _findAttrWithFieldName(_attrDef, _attrName) {
            if (_attrDef.fieldName === attrKey) {
              attrName = _attrName;
              return _attrDef;
            }
          });

          // If the specified `attrKey` is NOT a `fieldName` in the schema,
          // just leave the key and value as-is.
          if (!attrName) {
            memo[attrKey] = attrVal;
          }
          // If attribute IS in the relation's logical schema, use its `fieldName`
          else {
            // console.log('mapping key: '+attrKey+' in result records to -->',attrName);
            memo[attrName] = attrVal;
          }

          return memo;
        }, {});
      });
    }
  }

  return adapterOutput;
}

},{"lodash":90,"root-require":99,"util":131}],11:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var semver = _dereq_('semver');


/**
 * Configure a function which returns true for keys which are
 * version string satisfying the passed-in requirement.
 *
 * @param  {String} versionStringToSatisfy
 * @return {Function}
 */
module.exports = function _whereVersionStringSatisifes(versionStringToSatisfy) {
  return function (val, key) {
    var thisVersionString = key;
    if (semver.satisfies(versionStringToSatisfy, thisVersionString)) {
      return val;
    }
  };
};

},{"semver":101}],12:[function(_dereq_,module,exports){
module.exports = _dereq_('./Adapter');

},{"./Adapter":2}],13:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');

var prettyInstance = _dereq_('root-require')('standalone/pretty-instance');
var WLEntity = _dereq_('root-require')('standalone/WLEntity');


/**
 * Construct a Datastore.
 * (aka "Connection")
 *
 * Each Datastore instance maintains its own options,
 * which include configuration for a particular adapter.
 * Initial default options cascade down from the parent ORM
 * instance.
 *
 * In most cases, a Datastore instance also contains a set of
 * one or more Model(s).
 *
 * @constructor
 * @param {Object} definition
 */

function Datastore (definition) {
  definition = definition || {};

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  // Merge `definition` into the Datastore instance itself,
  // unless they are already defined.
  _mergeDefaults(this, definition);
}

// Qualifier
Datastore.isDatastore = WLEntity.qualifier;

// Accessor methods
Datastore.prototype.getAdapter = _dereq_('./accessors/getAdapter');
Datastore.prototype.getDatastore = _dereq_('./accessors/getDatastore');
Datastore.prototype.getModels = _dereq_('./accessors/getModels');

// Semantics
Datastore.prototype.query = _dereq_('./query');
Datastore.prototype.transaction = _dereq_('./transaction');
Datastore.prototype.bootstrap = _dereq_('./bootstrap');
Datastore.prototype.migrate = _dereq_('./migrate');
Datastore.prototype.refresh = _dereq_('./refresh');

/**
 * Inspect the structure of the underlying, adapter-level data store
 * and compare it with the app-level schema defined in this Datastore.
 */

Datastore.prototype.getSchemaDiff = function () {};


// Adapter-level methods for migrating data are implemented
// in adapters, not Waterline core.  However, they are listed
// here since we will want to provide access to them directly:
Datastore.prototype.define = _dereq_('./bridge/define');
Datastore.prototype.addIndex = _dereq_('./bridge/addIndex');
Datastore.prototype.removeIndex = _dereq_('./bridge/removeIndex');
Datastore.prototype.describe = _dereq_('./bridge/describe');
Datastore.prototype.drop = _dereq_('./bridge/drop');

// Presentation
Datastore.prototype.inspect = function () {
  return prettyInstance(this, _.reduce({
    adapter: this.adapter
  }, function(memo, val, key) {
    return memo+'\n • ' + key + ': ' + util.inspect(val, false, null);
  }, ''), 'Datastore <'+this.identity+'>');
};


module.exports = Datastore;

},{"./accessors/getAdapter":14,"./accessors/getDatastore":15,"./accessors/getModels":16,"./bootstrap":17,"./bridge/addIndex":18,"./bridge/define":19,"./bridge/describe":20,"./bridge/drop":21,"./bridge/removeIndex":22,"./migrate":24,"./query":25,"./refresh":26,"./transaction":27,"lodash":90,"merge-defaults":91,"root-require":99,"util":131}],14:[function(_dereq_,module,exports){
/**
 * Look up the live Adapter instance for this Datastore.
 *
 * @return {Adapter}
 */

module.exports = function getAdapter () {
  return this.orm.getAdapter(this.adapter);
};

},{}],15:[function(_dereq_,module,exports){
/**
 * Return self
 *
 * @return {Datastore}
 */

module.exports = function getDatastore () {
  return this;
};

},{}],16:[function(_dereq_,module,exports){
/**
 * @return {Model[]}
 */
module.exports = function getModels() {
  // TODO:
  throw new Error('todo');
};

},{}],17:[function(_dereq_,module,exports){
/**
 * #Datastore.prototype.bootstrap()
 *
 * Replace all existing records in the datastore's physical collections
 * with new records built from the provided datasets.
 *
 * @param {Object->Object[]} datasets
 * @param {Function} cb
 * @api public
 */

module.exports = function bootstrapDatastore (datasets, cb){
  cb(new Error('Not implemented yet!'));
};

},{}],18:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Datastore.addIndex()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'index name',
      type: 'string'
    },
    {
      label: 'index definition',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'addIndex',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'index name', 'index definition', 'callback']
  }
});

},{"../../Adapter":12}],19:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Datastore.define()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'model cid',
      type: 'string'
    },
    {
      label: 'attributes',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'define',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'attributes', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'attributes', 'callback']
  }
});

},{"../../Adapter":12}],20:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Datastore.describe()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'model cid',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'describe',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'callback']
  }
});

},{"../../Adapter":12}],21:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Datastore.drop()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'model cid',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'drop',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'model cid', 'callback'],
    '>=2.0.0': ['Datastore', 'model cid', 'callback']
  }
});

},{"../../Adapter":12}],22:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Datastore.removeIndex()`
 *
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'index name',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'removeIndex',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'index name', 'callback']
  }
});

},{"../../Adapter":12}],23:[function(_dereq_,module,exports){
module.exports = _dereq_('./Datastore');

},{"./Datastore":13}],24:[function(_dereq_,module,exports){
/**
 * #Datastore.prototype.migrate()
 *
 * Migrate all models in this datastore instance.
 * Alters physical collections to make them match the current
 * in-memory ontology.
 *
 * @param {Function} cb
 * @api public
 */

module.exports = function migrateDatastore (cb) {
  cb(new Error('Not implemented yet!'));
};

},{}],25:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

//
// ...
//


/**
 * #Datastore.prototype.query()
 *
 * Factory method to generate a new generic Waterline Query.
 *
 * Currently, this is identical to `ORM.prototype.query()`, but
 * it may wrap additional functionality in future versions of
 * Waterline.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */

module.exports = function query (opts, worker) {
  return this.orm.query(opts, worker);
};

},{}],26:[function(_dereq_,module,exports){
module.exports = function refresh() {
  // TODO
};

},{}],27:[function(_dereq_,module,exports){
/**
 * #Datastore.prototype.transaction()
 *
 * Build an atomic version of this datastore in order to perform
 * some async transactional logic.
 *
 * @param  {Function} cb  ({AtomicDatastore}, {Function})
 * @return {Deferred}
 */

module.exports = function getTransactional (cb){
  cb(new Error('Not implemented yet!'));
};

},{}],28:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var EventEmitter = _dereq_('events').EventEmitter;
var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');

var Adapter = _dereq_('../Adapter');
var Datastore = _dereq_('../Datastore');
var Junction = _dereq_('../Relation/Junction');
var Model = _dereq_('../Relation/Model');

// TODO: extrapolate and publish standalone modules..?
var WLEntity = _dereq_('root-require')('standalone/WLEntity');
var DEFAULT_LOG = _dereq_('root-require')('standalone/logger');
var WLError = _dereq_('root-require')('standalone/WLError');
var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');
var prettyInstance = _dereq_('root-require')('standalone/pretty-instance');


/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Models, Datastores, and Adapters called the "ontology".
 * Most applications will only instantiate one ORM, and usually we
 * will use the `Waterline()` factory, since it takes care of a few other
 * steps for us as well.
 *
 * Note that some of these methods mutate the ORM's ontology
 * (again, the in-memory representation of its the adapters,
 * datastores, and models.)  The ORM's public API should work at
 * any time-- including runtime.  Models can be added and removed
 * on the fly, as well as datastores, as well as adapters.
 *
 * @constructor
 * @param {Object} opts
 */

function ORM (opts) {

  var orm = this;

  // Ensure at least empty arrays exist in our ontology:
  this.adapters = [];
  this.datastores = [];
  this.junctions = [];
  this.models = [];

  // TODO: (eventually) cross-adapter commit log for transactions
  // this.commitLog = new Relation(...);

  // TODO: (eventually) cache for streaming map/reduce and, more
  // generally, overflowing footprints from QueryHeaps
  // this.heapCache = new Relation(...);


  // Now marshal opts and use them to extend our ontology:
  opts = opts || {};
  _mergeDefaults(opts, {

    // TODO:
    // Unless otherwise specified, hook up datastores to this adapter.
    // defaultAdapter: '_built-in-default-adapter',

    // TODO:
    // Unless otherwise specified, hook up models to this datastore.
    // defaultDatastore: '_built-in-default-datastore',

    // `compatibilityMode` should be enabled when this ORM instance
    // is being used with legacy adapters (Waterline v0.x).
    compatibilityMode: false,

    // Switchback support is enabled by default
    Switchback: typeof opts.Switchback !== 'undefined' ? opts.Switchback : _dereq_('node-switchback'),

    // Triggered when an error is emitted on the ORM itself
    // because it cannot be passed to a callback of the
    // method that caused it (e.g. a usage error about an
    // omitted callback.)
    onError: function (err) {
      if (typeof err !== 'object' || !err instanceof WLError) {
        err = new WLError(err);
      }
      throw err;
    },

    // Triggered when a non-fatal warning is emited on the ORM itself.
    onWarn: DEFAULT_LOG.warn

  });

  // Be tolerant of entities defined of objects
  // (marshal them to arrays)
  opts.models     = WLEntity.toArray(opts.models);
  opts.junctions  = WLEntity.toArray(opts.junctions);
  opts.datastores = WLEntity.toArray(opts.datastores);
  opts.adapters   = WLEntity.toArray(opts.adapters);


  // Now identify all of the models, datastores, and adapters
  // into our ORM's ontology.  __Actually calling__ these methods
  // is important to centralize the logic in their definitions.
  // For instance, the `ORM.prototype.identify*` methods provide
  // `this.orm` to all instances in our ontology.
  // Nothing else in the Waterline code base does this- it must happen here!
  _(opts.models)    .each(function(entity){ orm.identifyModel(entity); });
  _(opts.junctions) .each(function(entity){ orm.identifyJunction(entity); });
  _(opts.datastores).each(function(entity){ orm.identifyDatastore(entity); });
  _(opts.adapters)  .each(function(entity){ orm.identifyAdapter(entity); });


  // Merge remaining options directly into the Query instance
  _mergeDefaults(this, opts);

  // Listen for error events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('error', opts.onError);

  // Listen for warning events on this ORM instance and handle them using
  // configured options (or by default, log 'em)
  this.on('warn', opts.onWarn);

}

// ORM extends Node's EventEmitter
util.inherits(ORM, EventEmitter);

// Qualifier
ORM.isORM = WLEntity.qualifier;

// Semantics
ORM.prototype.query = _dereq_('./query');
ORM.prototype.bootstrap = _dereq_('./bootstrap');
ORM.prototype.transaction = _dereq_('./transaction');
ORM.prototype.refresh = _dereq_('./refresh');
ORM.prototype.migrate = _dereq_('./migrate');

// Identifiers
ORM.prototype.identifyModel = WLEntity.identifier('models', Model);
ORM.prototype.identifyJunction = WLEntity.identifier('junctions', Junction);
ORM.prototype.identifyDatastore = WLEntity.identifier('datastores', Datastore);
ORM.prototype.identifyAdapter = WLEntity.identifier('adapters', Adapter);

// Forgetters
ORM.prototype.forgetModel = WLEntity.forgetter('models');
ORM.prototype.forgetJunction = WLEntity.forgetter('junctions');
ORM.prototype.forgetDatastore = WLEntity.forgetter('datastores');
ORM.prototype.forgetAdapter = WLEntity.forgetter('adapters');

// Getters
ORM.prototype.getModel = WLEntity.getter('models');
ORM.prototype.getJunction = WLEntity.getter('junctions');
ORM.prototype.getDatastore = WLEntity.getter('datastores');
ORM.prototype.getAdapter = WLEntity.getter('adapters');

// Accessors
// (overloaded getter/identifier usage)
ORM.prototype.model = WLEntity.accessor('models', Model);
ORM.prototype.junction = WLEntity.accessor('junctions', Junction);
ORM.prototype.datastore = WLEntity.accessor('datastores', Datastore);
ORM.prototype.adapter = WLEntity.accessor('adapters', Adapter);

// Options setter
// ORM.prototype.options = function (){
//   // TODO
// };

// Getters for built-in association rule (AR) definitions
// (e.g. `has-fk`, `has-fkarray`, `via-junction`, etc.)
// These built-in rules for joining, subquerying, migrating, adding,
// removing, overriding, and identifying / garbage collecting relations
// attached to associations.
ORM.prototype.getDefaultAR = function (key) {
  // Case-insensitive
  switch (key.toLowerCase()) {
    // case hasobject   : require('./Relation/builtin-association-rules/has-object'),
    // case hasarray    : require('./Relation/builtin-association-rules/has-array'),
    case 'hasfk'        : return _dereq_('../Relation/builtin-association-rules/has-fk');
    case 'hasfkarray'   : return _dereq_('../Relation/builtin-association-rules/has-fkarray');
    case 'viafk'        : return _dereq_('../Relation/builtin-association-rules/via-fk');
    case 'viafkarray'   : return _dereq_('../Relation/builtin-association-rules/via-fkarray');
    case 'viajunction'  : return _dereq_('../Relation/builtin-association-rules/via-junction');
    default:
      throw new WLUsageError('Unknown association rule type: "'+key+'"');
  }
};


/**
 * #ORM.prototype.inspect()
 *
 * Presentation
 *
 * @return {String} that will be used when displaying
 *                  an ORM instance in `util.inspect`,
 *                  `console.log`, etc.
 */

ORM.prototype.inspect = function inspect () {
  return prettyInstance(this, util.format(
    ' • %d model(s)\n'+
    ' • %d datastore(s)\n'+
    ' • %d adapter(s)',
    this.models.length,
    this.datastores.length,
    this.adapters.length
  ));
};


module.exports = ORM;

},{"../Adapter":12,"../Datastore":23,"../Relation/Junction":52,"../Relation/Model":53,"../Relation/builtin-association-rules/has-fk":79,"../Relation/builtin-association-rules/has-fkarray":80,"../Relation/builtin-association-rules/via-fk":81,"../Relation/builtin-association-rules/via-fkarray":82,"../Relation/builtin-association-rules/via-junction":83,"./bootstrap":29,"./migrate":32,"./query":33,"./refresh":34,"./transaction":35,"events":126,"lodash":90,"merge-defaults":91,"node-switchback":95,"root-require":99,"util":131}],29:[function(_dereq_,module,exports){
/**
 * #ORM.prototype.bootstrap()
 *
 * Replace ALL existing records in any of the ORM's known physical
 * collections with new records built from the specified `datasets`.
 *
 * @param {Object->Object[]} datasets
 * @param {Function} cb
 * @api public
 */

module.exports = function bootstrapORM (datasets, cb){
  cb(new Error('Not implemented yet!'));
};

},{}],30:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_ ('lodash');

var AssociationRule = _dereq_('../Relation/AssociationRule');


/**
 * buildAR()
 *
 * Factory method that returns a new AssociationRule given
 * an attribute definition and its parent relation,
 *
 * @param  {[type]} attrDef [description]
 * @param  {[type]} parentRelation [description]
 * @return {AssociationRule}
 * @private
 */

module.exports = function buildAR (attrDef, parentRelation) {

  // Ensure that the otherRelation in the association
  // referenced by this would-be AR actually exists
  var otherRelation = (function _getOtherRelation (_relationType, _otherRelationIdentity) {
    switch (_relationType) {
      case 'model'   : return parentRelation.orm.model    (_otherRelationIdentity);
      case 'junction': return parentRelation.orm.junction (_otherRelationIdentity);
    }
  })(attrDef.association.entity, attrDef.association.identity);

  // Look up the definition of the foreign attr on the other relation
  // referenced by this AR (if `via` was specified)
  var otherAttr = otherRelation && otherRelation.attributes[attrDef.association.via];

  // Determine the default, built-in association rule to use
  var useRule;

  // `plural: false` (i.e. `model: *`)
  // (currently, always `hasFK`)
  // (but eventually it could also  be `embedsObject`)
  if (otherRelation && attrDef.association.plural === false) {
    useRule = 'hasFK';
  }

  // `plural: true` (`collection: *`)
  // Could be `viaFK` or `viaJunction`
  // (or eventually, could also be `hasFKArray`, `viaFKArray`, or `embedsArray`)
  else if (otherRelation && attrDef.association.plural === true) {

    // If another model+attribute exists with a `model` pointed back
    // at this relation's `identity`, the `via-fk` AR should be applied.
    //
    // Also, if this is a virtual backreference association
    // (for now, we'll just look at the attrName and see if it starts w/ `&`,
    // it is ALWAYS a viaFK)
    if (
      (function _isViaFKRuleAppropriate (){
        try {
          return (
            attrDef.name[0] === '&' ||
            (
              otherAttr.association.plural === false &&
              // TODO:
              // use case-insensitive comparison via a new instance method on Relation:
              // parentRelation.checkIdentity(otherAttr.association.identity)
              // (to do it static: WLEntity.matchIdentity(ident0,ident1))
              otherAttr.association.identity === parentRelation.identity
            )
          );
        }
        catch (e) {
          return false;
        }
      })()
    ) {
      useRule = 'viaFK';
    }

    // If the `via` points at a plural association,
    // (bidirectional hasMany (collection-->via<--collection))
    // or if no `via` exists,
    // (unidirectional hasMany (collection-->))
    // the `viaJunction` AR should be used.
    //
    else {
      useRule = 'viaJunction';
    }
  }

  // console.log('Built association rule for::::');
  // console.log('relation:',parentRelation.identity);
  // console.log('attrName:',attrDef.name);
  // console.log('useRule:',useRule);

  // Attempt to locate association rule configuration,
  // then mix in overrides:

  // TODO:
  // Allow for more versatile config options for association rules
  // at the model, datastore, adapter, and ORM level.

  // Provided w/i the attribute definition,
  if (attrDef.association.rule) {
    useRule = attrDef.association.rule;

    // (then remove the association rule config from the attrDef
    //  to enforce a consistent access pattern for ourselves throughout
    //  the rest of core.)
    delete attrDef.association.rule;
  }

  // If a string was specified, it refers to one of the built-in
  // AR strategies.  Resolve it to an object and merge it in to
  // our new AssociationRule instance.
  if (_.isString(useRule)) {
    useRule = parentRelation.orm.getDefaultAR(useRule);
  }
  // Lower-level, direct overrides (config object syntax)
  else if (_.isObject(useRule)) {
    useRule = _.merge(useRule, useRule);
  }
  // If no association rule was directly configured, and cannot be
  // inferred, then we should not instantiate one.
  else {
    return null;
  }


  // Finally instantiate an AR instance using the rule definition
  // we built up above.
  return new AssociationRule(
    (function _buildCompleteARDefinition() {
      return _.merge({
        parent: parentRelation,
        attrName: attrDef.name,
        attrDef: attrDef
      }, useRule);
    })()
  );

};


},{"../Relation/AssociationRule":51,"lodash":90}],31:[function(_dereq_,module,exports){
module.exports = _dereq_('./ORM');


},{"./ORM":28}],32:[function(_dereq_,module,exports){
/**
 * #ORM.prototype.migrate()
 *
 * Migrate all Datastores in this ORM instance.
 * Alters physical collections to make them match the current
 * in-memory ontology.
 *
 * Modifies the structure (and any existing data) of the underlying,
 * adapter-level datastores to match the in-memory ontology.
 *
 * Note:
 * The migrate interface honors the `migrate` option (safe, drop, or alter)
 * when working with existing data.
 *
 * @param {Function} cb
 * @api public
 */

module.exports = function migrateORM (cb) {
  cb(new Error('Not implemented yet!'));
};

},{}],33:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');

var Query = _dereq_('../Query');




/**
 * Factory method to generate a new Query
 * using this ORM instance.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */
module.exports = function query (opts, worker) {
  return new Query(_mergeDefaults(opts||{}, { orm: this }), worker);
};

},{"../Query":39,"lodash":90,"merge-defaults":91}],34:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_ ('lodash');
var WaterlineSchema = _dereq_('waterline-schema');

var buildAR = _dereq_('./build-association-rule');



/**
 * #ORM.prototype.refresh()
 *
 * Normalize / validate the ontology.
 * Check datastore configuration, validate model schemas, etc.
 * Run `waterline-schema` on this ORM instance to detect any
 * weird stuff and get a serialized schema object.
 *
 * @chainable
 * @return {ORM}
 */

module.exports = function refresh () {

  var orm = this;

  // console.log('REFRESHING ORM');

  // Get waterline-schema to fail silently, returning programmatically
  // understandable error objects, instead of try/catch
  try {

    // Mutates entities to be WL1.0-backwards-compatible.
    var modelsAsObj = _.reduce(this.models, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var datastoresAsObj = _.reduce(this.datastores, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var defaults = {};

    // We then pass these WL1.0 objects into `waterline-schema` to
    // get a schema and validate the ORM's state.
    // this.WL1Schema = WaterlineSchema(modelsAsObj, datastoresAsObj, defaults);
    // console.log('---------------WLSCHEMA------------------\n',require('util').inspect(this.WL1Schema, false, null));
    // console.log('</WLSCHEMA>------------------------------------');


    // log.skip(require('util').inspect(modelsAsObj, false, null));
  }
  catch(e) {
    // console.error('WLSCHEMA_ERROR:',e);
    // ...
    // this.WL1Schema = {};
  }

  //
  // TODO: implement a more intelligent `ORM.prototype.refresh`
  // that uses a `while` or recursive strategy to untangle and refresh
  // everything on the fly rather than brute-forcing it (see below)
  // //

  // _(this.models).each(function (currentModel) {
  //   currentModel.refresh();
  // });


  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing all MODELS');
  // console.log('************************');

  // Refresh models
  _(this.models).each(function (model) {
    model.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each model...');
  // console.log('************************');

  // After ALL models have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.models).each(function (model) {
    model.associationRules = [];
    _(model.associations).each(function (attrDef){
      var rule = buildAR(attrDef, model);
      if (rule) model.associationRules.push(rule);
    });
    // console.log('built %s association rules for model: %s', model.associationRules.length, model.identity);
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each model...');
  // console.log('************************');

  // Now that all of the ARs for models have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.models).each(function (model) {
    _(model.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing JUNCTIONS...');
  // console.log('************************');

  // Now, refresh all junctions
  _(this.junctions).each(function (junction) {
    junction.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each junction...');
  // console.log('************************');

  // After ALL junctions have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.junctions).each(function (junction) {
    junction.associationRules = [];
    _(junction.associations).each(function (attrDef){
      var rule = buildAR(attrDef, junction);
      if (rule) junction.associationRules.push(rule);
    });
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each junction...');
  // console.log('************************');

  // Now that all of the ARs for junctions have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.junctions).each(function (junction) {
    _(junction.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  /////////////////////////////////////////////////////////////////
  // Refresh models ONE LAST TIME to build association rules for
  // virtual backreference associations.
  /////////////////////////////////////////////////////////////////

  // Refresh models
  _(this.models).each(function (model) {
    model.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each model...');
  // console.log('************************');

  // After ALL models have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.models).each(function (model) {
    model.associationRules = [];
    _(model.associations).each(function (attrDef){
      var rule = buildAR(attrDef, model);
      if (rule) model.associationRules.push(rule);
    });
    // console.log('built %s association rules for model: %s', model.associationRules.length, model.identity);
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each model...');
  // console.log('************************');

  // Now that all of the ARs for models have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.models).each(function (model) {
    _(model.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  // console.log(orm.models);

  return this;
};


},{"./build-association-rule":30,"lodash":90,"waterline-schema":115}],35:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');

var Model = _dereq_('../Relation/Model');

var Deferred = _dereq_('root-require')('standalone/Deferred');
var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');
var Transaction = _dereq_('root-require')('standalone/Transaction');


/**
 * `ORM.prototype.transaction`
 *
 * orm.transaction([User, Kitten], function (User, Kitten, cb) {
 *   // do stuff
 *   cb();
 * }).exec(function (err) {
 *   // check for errors
 *   // if not, transation was safely committed
 * });
 *
 * @param  {Array{Model}}   modelsInvolved
 * @param  {Function} fn  ({AtomicModel}, {AtomicModel}, ..., {Function})
 * @return {Deferred}
 */

module.exports = function transaction ( modelsInvolved, transactionalLogic ) {

  // Validate usage
  var validUsage =
  _.isArray(modelsInvolved) &&
  _.all(modelsInvolved, function (model) {
    return _.isObject(model) && model instanceof Model;
  }) &&
  _.isFunction(transactionalLogic);
  if (!validUsage) throw new WLUsageError({reason: 'Invalid usage of `orm.transaction()`'});

  // Return deferred object that runs the transaction
  var transactionInstance = new Transaction(modelsInvolved, transactionalLogic);
  return new Deferred({
    Switchback: this.Switchback
  }, transactionInstance.runner);
};

},{"../Relation/Model":53,"lodash":90,"root-require":99}],36:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');


var normalizeCriteria = _dereq_('root-require')('standalone/normalize-criteria');
var $$ = _dereq_('root-require')('standalone/CRITERIA-MODIFIERS');
var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');
var Deferred = _dereq_('root-require')('standalone/Deferred');
var prettyInstance = _dereq_('root-require')('standalone/pretty-instance');
var keysIn = _dereq_('root-require')('standalone/keys-in');
var QueryHeap = _dereq_('root-require')('standalone/QueryHeap');




/**
 * Construct a Query.
 *
 * Query inherits from Deferred, and represents one or more
 * (usually semi-atomic) operations on one or more Datastores.
 *
 * A Query is often spawned from a Model or Junction, but this is not
 * necessarily required- for instance it might be spawned directly from
 * a Datastore. A Query can also be instantiated directly using this
 * constructor, as long as the appropriate options are passed in
 * (most importantly an `orm` instance or `_adapterWorker` function.)
 *
 * Base Query options (`opts`) are passed down by the caller (as
 * mentioned previously- this is usually either a Relation or Datastore.)
 * However additional options may be set before running the query using
 * the `.options()` modifier or `options: {}` syntax in the criteria obj.
 *
 * @constructor
 * @extends {Deferred}
 *
 * @param {Object} opts
 * @param {Function} _adapterWorker
 */

function Query (opts, _adapterWorker) {
  opts = opts || {};

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  // If `where`, `limit`, etc. were passed in at the top level,
  // and `criteria` was NOT passed in, merge in any top-level criteria
  // modifiers:
  if (typeof opts.criteria === 'undefined') {
    opts.criteria = _.pick(opts, keysIn($$.CRITERIA_MODS, $$.WL1_AGGREGATION_MODS, $$.WL1_JOIN_MODS));
  }

  // Delete keys from opts that would inadvertently override query modifier methods
  // (e.g. "select", "where") when opts are merged into `this` later on
  _($$.CRITERIA_MODS).keys().each(function (key) {
    delete opts[key];
  });

  // Delete criteria modifiers with undefined values to avoid unexpected issues
  // in WL1 integration:
  opts.criteria = _.pick(opts.criteria, function (val) {
    return typeof val !== 'undefined';
  });

  // If an aggregation/groupby or otherwise "currently WL1-only" modifier is set
  // on this query, automatically mark the query as "raw"
  // (see note above for caveat about the future of this)
  if (_.any(opts.criteria, keysIn($$.WL1_AGGR_MODS))) {
    opts.raw = true;
  }

  // console.log('BEFORE',opts.criteria);

  // If this Query originated from a relation, access it in order to pass it down
  // into `normalizeCriteria`
  var targetRelation = (function _lookupRelation(){
    if (!opts.criteria.from || !opts.orm) return;
    else if (_.isString(opts.criteria.from)) {
      return opts.orm.model(opts.criteria.from);
    }
    else if (_.isObject(opts.criteria.from)) {
      switch (opts.criteria.from.entity) {
        case 'model': return opts.orm.model(opts.criteria.from.identity);
        case 'junction': return opts.orm.junction(opts.criteria.from.identity);
      }
    }
  })();

  // Pass in `criteriaMetadata` for tracking additional information about
  // the criteria to use below...
  var criteriaMetadata = {
    numSubqueries: 0,
    numJoins: 0
  };

  // Normalize the criteria syntax
  opts.criteria = normalizeCriteria(opts.criteria, targetRelation, criteriaMetadata);

  // Examine criteriaMetadata and set the appopriate metadata properties on `opts`
  // (will be merged into `this` momentarily)
  opts.numSubqueries = criteriaMetadata.numSubqueries||0;
  opts.numJoins = criteriaMetadata.numJoins||0;

  // If the criteria tree is shallow (no joins/subqueries), we can enable `raw`
  // to avoid running unnecessary extra adapter queries.
  // (this also has the nice side-effect of making a number of the WL1 tests pass)
  if ( opts.numSubqueries===0 && opts.numJoins===0 ) {
    opts.raw = true;
  }

  // console.log('AFTER',require('util').inspect(opts.criteria, false, null));
  // console.log('numSubqueries:',opts.numSubqueries,'numJoins:',opts.numJoins);


  // Merge remaining options directly into the Query instance,
  _.merge(this, opts);

  // Construct the query heap
  this.heap = new QueryHeap({
    orm: this.orm
  });

  // Within the top-level public heap for a given query, a local buffer also exists
  // for each spawned cursor, indexed by treepath.
  // The purpose of `localHeap` is to store/sort/rank pages of in-memory-filtered parent
  // records (i.e. `filteredBatchResults`) accumulated over the course of paging/batching
  // through the entire parent result set.
  // Eventually, all records in the localHeap will be pushed to the top-level
  // query heap for further processing and, eventually, will be output to the
  // original caller of the query method.
  this.heap.malloc('root', this.criteria);

  // Expose `this.cache` as a synonym for `this.heap`
  // TODO: deprecate this once we're sure all references to `cache` are gone.
  this.cache = this.heap;

  // Determine whether streaming is possible given the
  // specifics of this query (`this.criteria`) and the ontology.
  // (defaults to false)
  // ...
  this.streamable = false;
  // (TODO)

  // Advisory flag indicating whether this Query's results should be
  // buffered in memory.  Set depending on usage, but may also be
  // automatically set if size of result set exceeds the high water mark.
  // Streaming usage whether this flag is true or not- but if this flag
  // is set to `false`, instead of the buffered results, the stream instance
  // will be passed to the promise/callback.
  // (defaults to true)
  this.buffering = true;

  // Save the original worker function
  // (this will be wrapped so that output from the adapter may be
  // intercepted and parsed, and all the different usages may be
  // supported)
  this.worker = _adapterWorker;

  // Before calling the Deferred super constructor, make sure, if possible,
  // we've grabbed the Switchback factory from the ORM instance behind this
  // query and attached it to ourselves
  if (this.orm && this.orm.Switchback) {
    this.Switchback = this.orm.Switchback;
  }

  // Call Deferred's constructor with an intercepted worker function
  // which intermediates between the Query and the Adapter.
  // (used by .exec(), .log(), and promises impl.)
  Query.super_.apply(this, [this, _.bind(this.run, this)]);

  // console.log('Built query w/ WHERE Clause:', require('util').inspect(this.criteria.where, false, null));

}


// Query inherits from Deferred.
util.inherits(Query, Deferred);


/**
 * For presentation purposes only- what this Query
 * looks like when it is logged to the console.
 * @return {String}
 */
Query.prototype.inspect = function () {
  return prettyInstance(this, this.criteria);
};


/**
 * Wrapper function for query runner.
 * @return {Query}
 */
Query.prototype.run = _dereq_('./run');

/**
 * Default result parser
 * (can be overridden in Query opts)
 */
Query.prototype.parseResults = _dereq_('./results/parse');


// Query modifiers
Query.prototype.options = _dereq_('./modifier-methods/options');
Query.prototype.select = _dereq_('./modifier-methods/select');
Query.prototype.set = _dereq_('./modifier-methods/set');
Query.prototype.populate = _dereq_('./modifier-methods/populate');
Query.prototype.where = _dereq_('./modifier-methods/where');
Query.prototype.limit = _dereq_('./modifier-methods/limit');
Query.prototype.skip = _dereq_('./modifier-methods/skip');
Query.prototype.sort = _dereq_('./modifier-methods/sort');
Query.prototype.paginate = _dereq_('./modifier-methods/paginate');


module.exports = Query;

},{"./modifier-methods/limit":40,"./modifier-methods/options":41,"./modifier-methods/paginate":42,"./modifier-methods/populate":43,"./modifier-methods/select":44,"./modifier-methods/set":45,"./modifier-methods/skip":46,"./modifier-methods/sort":47,"./modifier-methods/where":48,"./results/parse":49,"./run":50,"lodash":90,"root-require":99,"util":131}],37:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var assert = _dereq_('assert');
var _ = _dereq_('lodash');
var async = _dereq_('async');
var WLTransform = _dereq_('waterline-criteria');

var extractSubTree = _dereq_('root-require')('standalone/extract-criteria-subtree');
var flattenClause = _dereq_('root-require')('standalone/flatten-criteria-clause');
var criteriaUnion = _dereq_('root-require')('standalone/criteria-union'); // TODO: use this for `where..whose` vs. `select..where` optimizations

var WLError = _dereq_('root-require')('standalone/WLError');
var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');
var pruneUndefined = _dereq_('root-require')('standalone/prune-undefined');
var QueryHeap = _dereq_('root-require')('standalone/QueryHeap');
var lookupRelationFrom = _dereq_('root-require')('standalone/lookup-relation-from');



/**
 * cursor()
 *
 * This module executes a Query's plan.
 * While optimizations in the plan are implemented where possible, a worst-case-scenario
 * shim is implemented by paging through underlying records using raw queries, taking
 * advantage of a number of additional on-the-fly optimizations.
 *
 * Recursive, asynchronous function evaluates a criteria tree, then descends
 * into nested criteria trees (SELECT/projections/joins) and subqueries (WHERE/filter/`whose`).
 *
 * @this {Query}
 *
 * @param {Object} opts
 *
 *                 opts.criteria   - A criteria tree object, set by the caller.
 *                                   It does not necessarily represent a branch of the ancestral criteria tree
 *                                   passed to the original Query and may therefore be manipulated by the caller
 *                                   for her own purposes.  This feature is useful for transforming associations
 *                                   in the query criteria syntax into lower-level predicates that can be safely
 *                                   evaluated by the other logic in the cursor.
 *
 *                 opts.query      - reference to the parent Query instance that spawned this cursor.
 *                                   (this is how we get access to the orm's ontology and convenience methods)
 *
 *                 opts.filter     - in-memory filter function that should be called with the initial batch of
 *                                   raw query results to transform them.  This could do anything-- it's up to
 *                                   the caller to build this function and return something meaningful.
 *                                   (this is useful for evaluating recursive subqueries.)
 *
 *                 Performance tuning opts: (optional)
 *                 =====================================
 *                 batchSize                 - # of records to return per batch when paging
 *                 minNumIntermediateResults - buffer filtered page results until this minimum # of records is reached before continuing with the recursive step (processing joins, etc.)
 *
 *
 * @param {Function} cb
 */

function criteriaCursor (options, cb) {

  // Parse options
  var criteria = options.criteria;
  var query = options.query;
  var filterFn = options.filter;
  var previous = options.previous;

  // Start off w/ depth === 0 and the initial query path as simply
  // the identity of the top-level parent relation.
  var depth = options.depth = options.depth||0;
  var qpath = options.qpath = options.qpath||'root';

  console.log('\n');
  if (depth===0) {
    // console.log('\n');
    // console.log('\n');
    // console.log('\n\nMODELS');
    // console.log(options.query.orm.models);
    // console.log('\n');
    console.log('********************************************');
    console.log('NEW ROOT CURSOR');
    console.log('********************************************');
    // console.log('criteria:');
    console.log(util.inspect(criteria, false, null));
    console.log('********************************************');
  }
  else {
    console.log('--- --- --- recursive step --- --- ---');
  }
  console.log('\n\n\nSpawned cursor @ level %d', depth, 'from '+criteria.from.entity+ ': '+criteria.from.identity);
  console.log();
  // console.log('criteria:',util.inspect(criteria,false,null));

  // Grab hold of the query's ORM, heap, and constructor
  // (these are the same for each recursive step)
  var orm = query.orm;
  var heap = query.heap;

  // Flags indicating whether optimizations are enabled or not
  var ENABLED_OPTIMIZATIONS = {
    accumulatePageResults: true
  };


  var BATCH_SIZE = options.batchSize||100;
  var MIN_NUM_INTERMEDIATE_RESULTS = options.minNumIntermediateResults||BATCH_SIZE;


  // Locate `src` relation (model or junction)
  var src = lookupRelationFrom(criteria.from, orm);
  if (!src) {
    return cb(new WLError(util.format('"%s" does not exist in the ontology (should be a known model or junction)',criteria.from)));
  }

  // Compute a flattened version of the WHERE clause
  // This eliminates nested WHEREs (aka subqueries)
  var flatWhere = flattenClause(criteria.where);

  // Lookup subqueries for simpler access
  var subqueries = extractSubTree(criteria, 'where');

  // Next, it's time to take care of joins.
  var joins = extractSubTree(criteria, 'select');


  // Build SELECT clause for the raw query
  //
  // TODO: Build SELECT clause to get only the footprints
  // (use only the primary key + any relevant foreign keys)
  // (relevant meaning there exists subselects that depend on them for `via` of a N.1 or N.M association)
  var select = {};
  // Always select the parent's primary key
  select[src.primaryKey] = true;
  // For now, grab everything!!!
  select['*'] = true;
  // _.each(src.attributes, function (def,attrName){
  //   select[attrName] = true;
  // });

  // Build WHERE clause for the raw query
  var where = _.cloneDeep(flatWhere);

  // <optimization>
  // In some cases, we CAN apply the original WHERE clause to our paging queries.
  // However, to do that, we must have certainty that no relevant (i.e. cousins)
  // WHOSE subquery clauses exist with an incompatible (i.e. disjoint) `whose`/`min`/`max`
  // tuple. So for now, we do not apply it at all.
  //
  // And consequently, we have to filter it out in-memory later.  Either way, this
  // strategy is an inevitability for certain scenarios- it's just that we can use
  // this optimization to make sure it only happens when it absolutely has to.
  // </optimization>

  var pageNo;
  var batchResults;
  var filteredBatchResults = [];


  // <optimization>
  // OPTIMIZE:
  // use an optimized (O(C)) approach if possible to skip the paging step.
  // this could be taken care of in the query optimizer beforehand, modifying
  // the query plan to make it more explicit.
  // Even then, the plan would need to be inspected at this point to determine
  // whether to page or not to page.
  //</optimization>

  // Page through records:
  async.doUntil(function doWhat (next_batch) {

    // Increment the page number (or start off on page 0)
    pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

    // Find a batch of records' primary keys
    src.find({
      select: select,
      where: where,
      limit: BATCH_SIZE,
      skip: BATCH_SIZE * pageNo,
      from: {
        entity: src.entity,
        identity: src.identity
      }
    })
    .options({raw: true})
    .exec(function (err, _batchResults){
      if (err) return next_batch(err);

      // Expose `batchResults` in closure scope so it can be accessed
      // by `async.until()` for use in the halt predicate
      batchResults = _batchResults;

      // If a filter function was specified, run it on the batchResults
      var _filteredBatchResults;
      if (_.isFunction(filterFn)) {

        // The job of the `filterFn` is to apply an in-memory filter from
        // the previous recursive step on each new set of batch results.
        // This allows us to exclude records which are not actually
        // associated with the previous batch of results (this is because
        // a child criteria alone is not always sufficient to capture the
        // complexity of an association rule.)
        _filteredBatchResults = filterFn(batchResults);
      }
      else _filteredBatchResults = batchResults;


      // --------------------------------------------------------------------
      // <optimization: accumulate page results before recursive step>
      if (
        ENABLED_OPTIMIZATIONS.accumulatePageResults &&

        // If we have not traversed the entire collection yet,
        batchResults.length >= BATCH_SIZE &&
        // and there aren't enough `_filteredBatchResults` to be "worth it" to continue
        // with the recursive step(s) and spin up child cursors that will page over our
        // associated record collections,
        filteredBatchResults.length < MIN_NUM_INTERMEDIATE_RESULTS
      ) {
        // hold on to these filtered results so far, but also accumulate
        // another page of results before continuing to the recursive step(s).
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
        return next_batch();
      }

      // Otherwise just concat the new results to `filteredBatchResults` and continue forward.
      else {
        filteredBatchResults = filteredBatchResults.concat(_filteredBatchResults);
      }
      // </optimization>
      // --------------------------------------------------------------------


      // console.log('page #'+pageNo + ' criteria: ',{
      //   select: select,
      //   where: where,
      //   limit: BATCH_SIZE,
      //   skip: BATCH_SIZE * pageNo,
      //   from: {
      //     entity: src.entity,
      //     identity: src.identity
      //   }
      // });
      // console.log('filteredBatchResults:',_.pluck(filteredBatchResults, src.primaryKey));
      // console.log('_batchResults:',_.pluck(_batchResults, src.primaryKey));


      /**
       * finishBatch()
       *
       * Called when this batch of parent records is complete and
       * ready to be persisted to the heap's local buffer.
       *
       * @api private
       */
      function finishBatch () {

        // Now that all the backfiltering relying on child records is complete,
        // our `filteredBatchResults` is close to ready-- we no longer rely on
        // any asynchronous operations in order to calculate the final parent
        // result set we want to persist for this batch.
        //
        // It is important to realize that, up until this point, the
        // `filteredBatchResults` might have contained records that did not satisfy
        // the original WHERE criteria. We don't want those guys to end up in the
        // local query buffer in the heap - that would be bad news.
        //
        // So before continuing onward,  we use an in-memory filter to eliminate
        // those results which do not satisfy that original WHERE clause to avoid
        // adding extraneous records to the heap's local buffer (which, aside from being a
        // waste of resources, would lead to incorrect query results.)
        //
        // <optimization>
        // OPTIMIZE: skip this in-memory filter if the WHERE filter was already
        // applied (i.e. if the WHOSE criteria from a previous recursive step
        // would yield a proper subset of the records that the WHERE criteria
        // would yield.)  In that case, we can pass the complete WHERE directly
        // into the subcriteria (rather than the union of the populate..where and
        // the where..whose clauses), and so the relevant adapter will take care
        // of that logic for us.
        // </optimization>
        //
        // On the other hand, if the where..whose clause was NOT a proper subset
        // of the select..where clause, we had to union them together in order
        // to reuse these child records for backfiltering parent records (i.e. to
        // satsify WHOSE subqueries).  So we must prune `filteredBatchResults` here
        // to remove those records which do not satisfy the original WHERE.
        // console.log('enforced doubleBatchFilter on filterdBatchResults for %s using criteria:',qpath,util.inspect( {where: criteria.where }, false, null));
        // console.log('here they are before filtering:',util.inspect( filteredBatchResults, false, null));


        var doubleBatchFilter = flattenClause({ where: criteria.where });

        var doubleFilteredBatchResults = WLTransform(filteredBatchResults, doubleBatchFilter).results;
        // console.log('at qpath %s, doubleFilteredBatchResults ===>',qpath,doubleFilteredBatchResults);

        // console.log('\n-(at depth === %d, qpath==="%s", from %s: "%s")-\nChecking if there are footprints to push...', depth, qpath, criteria.from.entity, criteria.from.identity);

        // If this is NOT the root cursor, use `previous.getRelated` (the AR from the previous
        // recursive step) to index `doubleFilteredBatchResults` by their future parent's
        // pk value before pushing them to the appropriate buffers in the heap.
        if (previous) {
          //
          // Note that this parent PK calculation is really just an estimate-- we don't
          // know for sure that the referenced parent record(s) will even exist in the final
          // result set.  But since they might, we have to calculate in order to properly
          // file these records in the appropriate sort/limit/skip bucket(s).
          //
          // console.log('(there are %d `doubleFilteredBatchResults`)', doubleFilteredBatchResults.length);

          _(doubleFilteredBatchResults).each(function (record){
            // console.log('checking for related parent records in '+previous.relation.identity+' for', record);
            var relatedParentRecords = previous.getRelated(record);
            // console.log('related parent records:', relatedParentRecords);
            _.each(relatedParentRecords, function (potentialParentRecord) {
              var potentialParentPKValue = potentialParentRecord[previous.relation.primaryKey];

              // Determine the identity of the record-specific buffer and, if it doesn't
              // exist, malloc it using the current cursor's criteria.
              var _bufferIdentity = previous.qpath + '['+potentialParentPKValue+'].' + options.attrName;
              if (!query.heap._buffers[_bufferIdentity]) {
                query.heap.malloc(_bufferIdentity, criteria);
              }

              // Then push the new records to the buffer.
              query.heap.pushFootprints(_bufferIdentity, [record]);
              // console.log('  • Pushed %d footprints to heap buffer: "%s"',1,_bufferIdentity);
            });
          });
        }
        // Otherwise, just push the records as "root"
        else {
          query.heap.pushFootprints('root', doubleFilteredBatchResults);
          // console.log('  • Pushed %d footprint(s) to root heap buffer',doubleFilteredBatchResults.length);
        }

        // Clear out accumulated `filteredBatchResults` to prepare
        // for the next page of parent candidates.
        filteredBatchResults = [];

        // Now we jump into the next batch of parent records.
        return next_batch();
      }


      // If there are no joins, skip ahead.
      if ( !Object.keys(joins).length ) {
        return finishBatch();
      }


      // -------------------------------------------------------
      // <async.each>
      //
      // If the criteria at the current cursor position has one
      // or more recursive SELECT clauses, (i.e. joins)
      // take the recursive step using the remaining child records
      // (or use optimized approach, i.e. call `.join()` in the adapter)
      // console.log('\n\n*~* JOINS *~*:',util.inspect(joins, false, null));
      async.each(Object.keys(joins), function eachJoin (attrName, next_association) {

        // console.log('something is going wrong with attribute: %s', attrName);

        // Lookup the association rule for this join
        var rule = src.getAssociationRule(attrName);
        if (!rule) {

          // TODO: handle virtual attrs

          return next_association(new WLUsageError(util.format('Query failed - in relation %s, `.getAssociationRule()` returns no no valid AR for attribute: "%s"',src.identity, attrName)));
        }

        // Lookup the associated relation
        var otherRelation = rule.getOtherRelation();

        // Now build the actual subcriteria we'll pass down to the recursive step.
        var subcriteria = {

          // Transparently pass down limit/skip/sort if it exists in subcriteria
          limit: joins[attrName].limit||undefined,
          skip: joins[attrName].skip||undefined,
          sort: joins[attrName].sort||undefined,


          select: (function _buildSELECT(){
            var subselect = {};

            // Always include primary key of the associated relation.
            // (REFACTOR: maybe we can remove this? it should be happening automatically
            // at the top of the recursive step anyway)
            subselect[otherRelation.primaryKey] = true;

            // Merge the nested SELECT modifier from the parent tree (`joins[attrName]`)
            // into the actual query object (`subcriteria`) that will be passed into the
            // recursive step. This will include both grandchild nested SELECT clauses
            // as well as primitive attributes.
            subselect = _.merge(subselect, joins[attrName].select);

            return subselect;
          })(),

          // Pass in the `WHERE` clause here.
          // (i.e. this is the same thing whether it is the top-level `{where:{}}`
          //  or a nested `{select: {where:{...}}`)
          //
          // NOTE
          // The viaJunctor AR will actually extend this where with a `whose` clause.
          where: joins[attrName].where,

          // Build the FROM ("model" or "junction")
          from: {
            entity: otherRelation.entity,
            identity: otherRelation.identity
          }
        };


        // console.log('subcriteria BEFORE childFilter:', subcriteria);
        // console.log('flatWhere:', flatWhere);

        // Augment the subcriteria to ready it for use in the recursive step.
        subcriteria = rule.getCriteria(filteredBatchResults, subcriteria);

        // Build a synchronous filter function to be run on each page
        // of next parent results within the recursive step.
        var childFilterFn = rule.getChildFilter(filteredBatchResults, subcriteria, criteria);

        // Spawn a new child cursor (i.e. take the recursive step)
        // which is specific to:
        //  • the current association/attribute and its AR
        //  • the current batch of parent results
        //
        // Note that we also increment the depth counter and update the tree path
        // (will be necessary within the rapidly approaching recursive step)
        return criteriaCursor({
          criteria: subcriteria,
          filter: childFilterFn,
          query: query,
          depth: depth+1,
          qpath: qpath + '.' + attrName,
          attrName: attrName,
          previous: {
            qpath: qpath,
            relation: src,
            omitUnrelated: childFilterFn,
            getRelated: rule.buildGetRelatedFn(filteredBatchResults, query, qpath),
            rule: rule
          }
        },

        // NOTE:
        // `subcriteriaResults` does NOT exclude child records which failed
        // the `populate..where` filter. We need ALL of the child records
        // associated with this batch of parent records so we can use them
        // to apply the WHOSE filter and exclude the appropriate parent results.
        // Consequently, it would generally be OK for `subcriteriaResults` to be
        // a set of some kind of enhanced footprint- in every AR impelmented so far,
        // we haven't needed complete records (just need the PK or an FK, depending
        // on the AR.)
        //
        // For instance, the following example query searches for parent records
        // with friends named "frank", and populates all of their friends
        // named "lara".  So we need the "frank"s to make a determination about
        // the validity of the parent record, but we need the "lara"s for the
        // final result set.
        //
        // ```
        // {
        //   where: {
        //     friends: {
        //       whose: { name:'frank' }
        //     }
        //   },
        //   select: {
        //     friends: {
        //       where: {
        //         name: 'larry'
        //       }
        //     }
        //   }
        // }
        // ```
        function afterThisRecursiveStepIsComplete (err, subcriteriaResults) {
          if (err) return next_association(err);

          // Determine if this criteria has a subquery.
          var subquery = subqueries[attrName];
          var hasSubquery = _.isObject(subquery) && Object.keys(subquery).length;
          // console.log('\n\nsubqueries: ',subqueries);
          // console.log('trying to apply subquery for ' + qpath + ' using ',attrName);//, ':: new qpath results::',subcriteriaResults);
          // console.log('parentBatchResults for ' + qpath + ' before backfiltering based on ',attrName,':::',filteredBatchResults);//, ':: new qpath results::',subcriteriaResults);


          // If there is a subquery, use these `subcriteriaResults` from
          // the recursive step to eliminate parent results from this batch's
          // result set (i.e. `filteredBatchResults`)
          if ( hasSubquery ) {
            // Assertion:
            if (!subquery.whose) {
              return next_association(new WLError('Unexpected criteria syntax (missing `whose` in subquery)'));
            }

            // Use WLTransform to calculate which of the child records pass
            // the WHOSE subquery check.
            // console.log('{where: subquery.whose}:', util.inspect({where: subquery.whose}, false, null));
            var childRecordsWhose = WLTransform(subcriteriaResults, {where: subquery.whose}).results;
            // console.log('childRecordsWhose:', childRecordsWhose);

            // These "backfiltered" results will consist of parent records who survived
            // the WHOSE check (i.e. their children survived the `childFilterFn()`
            // within the recursive step)
            var backfilteredBatchResults = (function _getBackfilteredBatchResults (){

              // The job of the `parentFilterFn()` is to prune parent batch results
              // WHOSE children failed the `childFilterFn()`
              var parentFilterFn = rule.getParentFilter(
                filteredBatchResults,subcriteria,criteria
              );

              // It does this by passing in `childRecordsWhose`.
              return parentFilterFn(childRecordsWhose);
            })();
            // console.log('backfilteredBatchResults: ',backfilteredBatchResults);

            // Mutate `filteredBatchResults` in-place, removing parent records
            // whose children do not match the WHOSE subquery clause.
            // It is necessary to remove invalidated parent records like this
            // (rather than altogether replacing `filteredBatchResults` with our new
            // backfiltered results) because `filteredBatchResults` could have already
            // lost some of its parent records when it was pruned by a WHOSE subquery
            // from another association.
            var backfilteredBatchResultsPKValues = _.pluck(backfilteredBatchResults, src.primaryKey);
            // console.log('Here are the filteredBatchResults (for %s) BEFORE MUTATION: ',qpath,filteredBatchResults);
            filteredBatchResults = _.where(filteredBatchResults, function (result) {
              return _.contains(backfilteredBatchResultsPKValues, result[src.primaryKey]);
            });

            // console.log('MUTATED filteredBatchResults (for %s) into: ',qpath,filteredBatchResults);
          }



          // Finally, continue on to the next association
          return next_association();
        });

      },


      ///////////////////////////////////////////////////////////////////////////
      // NOTE:
      // Backfilter (WHOSE + populate..WHERE) stuff could maybe live here, in
      // the `whenDoneWithAllJoins` callback, instead of in the callback from
      // the recursive step from each association.
      // (but then we'd have to accumulate child results across every association)
      // (currently, we accumulate the batch of parent results, but child results
      //  are local within the `async.each()`)
      ///////////////////////////////////////////////////////////////////////////
      function whenDoneWithAllJoins (err) {
        if (err) return next_batch(err);

        return finishBatch();
      });
      // </async.each>
      // -------------------------------------------------------

    });
  },
  function doUntil () {

    // Keep batching until the batch returns fewer than BATCH_SIZE results.
    if (batchResults.length < BATCH_SIZE) {
      return true;
    }
    else {
      return false;
    }
  },

  function whenDoneWithAllBatches (err) {
    if (err) return cb(err);

    // TODO:
    // It is important to note that currently, we do not allow primary keys
    // with "." or "[" or "]" because of the way buffer keys are indexed.
    // This could be pretty easily cleaned up, but it should be done AFTER
    // all the tests pass.

    // Get the set of buffers representing the parent results from the previous
    // recusive step.  If this is the root cursor, just use the qpath (i.e. "root")
    var _bufferRegExp;
    var _bufferIdents;
    if (previous) {
      _bufferRegExp = new RegExp('^'+_escapeForRegExpConstructor(previous.qpath)+'\\[([^\\.\\[\\]]+)\\]');
      _bufferIdents = query.heap.getBufferIdentitiesLike(_bufferRegExp);
    }
    else {
      _bufferIdents = ['root'];
    }


    // Send one final query to the parent relation to "fulfill"
    // the footprints and turn them into complete records in the
    // top-level query heap.
    src.find({

      from: criteria.from,

      where: (function _topFootprintWHEREClause () {
        var where = {};

        // Pick off the first LIMIT footprints and pluck their
        // primary key values.  Then use them for our IN query.
        where[src.primaryKey] = (function _topFootprintPKValues() {


          // Get the union of the footprints from ALL the previous buffers-- but first, do a final
          // sort/paginate on each buffer to ensure that only the relevant footprints are
          // hydrated.
          var footprints = _.reduce(_bufferIdents, function _paginateAndSortFootprintsForEachParentRecord (memo, bufferIdent) {

            var _someFootprints = query.heap.get(bufferIdent);

            // console.log('Preparing to hydrate footprints for `'+src.identity+'`. heap's local buffer has:',util.inspect(footprints,false,null));
            // _someFootprints = WLTransform.sort(_someFootprints, criteria.sort||{});
            //
            // TODO:
            // allow for >1000000 records in result set- instead of doing the following,
            // if no limit is set, just clip off the first SKIP records
            //
            // _someFootprints = _someFootprints.slice(criteria.skip||0, (criteria.limit||1000000)+(criteria.skip||0) );

            memo.push.apply(memo, _someFootprints);
            return memo;
          }, []);


          var footprintPKVals = _.pluck(footprints, src.primaryKey);
          return footprintPKVals;
        })();
        return where;
      })(),

      select: select //??? why isn't this criteria.select? ???
    })
    .options({
      raw: true,
      purpose: 'hydrate footprints' // purely advisory (for development/testing)
    })
    .exec(function (err, results) {
      if (err) return cb(err);

      // Now our hydrated `results` must be regrouped so they can be stored
      // in the appropriate heap buffer for use in the integrator.
      //
      // If this is the root cursor, we can just use them to hydrate the buffer
      // identified by `qpath` (i.e. "root")
      if (!previous) {
        // console.log('  • Rehydrating into buffer: %s', 'root');
        // console.log('    • hydrated %d record(s) from %s: "%s"', results.length, criteria.from.entity,criteria.from.identity);
        heap.rehydrate('root', results);
      }
      else {

        // console.log('\n\n-----:-:-:-:-:-:------- ');
        // console.log('previous: ',previous.relation.identity);
        // console.log('qpath: ',qpath);
        // console.log('results: ',results);

        // Use `previous.getRelated()` to figure out which of the current results belong w/ each
        // parent primary key. To figure this out, we have to rely on the association
        // rule that was passed down.
        _.each(results, function (hydratedRecord) {
          // console.log('                         (checking hydratedRecord %s)', hydratedRecord[src.primaryKey]);
          var relatedParentRecords = previous.getRelated(hydratedRecord);
          // console.log('                         (got %d relatedParentRecords)', relatedParentRecords.length);

          // Rehydrate the related buffers
          var relatedParentPKVals = _.pluck(relatedParentRecords, previous.relation.primaryKey);
          _.each(_bufferIdents, function _forEachRelatedBufferIdentity (_bufferIdent) {

            // console.log('  • Rehydrating into buffer: %s', _bufferIdent);

            // Parse the primary key value of the **parent relation from the previous recursive step**
            // from the buffer identity.
            var _bufferPKValue = (function _parseBufferPKValue () {
              var matchedTokens = _bufferIdent.match(_bufferRegExp);
              return matchedTokens && matchedTokens[1];
            })();

            // Use `primaryKeyCompare()` to ensure value-type issues don't exclude
            // relevant matches (i.e. it will cast both sides to strings becore comparing)
            var isRelated = _.any(relatedParentPKVals, function (relatedParentPKVal){
              return ((relatedParentPKVal+'') === (_bufferPKValue+''));
            });

            // console.log('for _bufferPKValue:', _bufferPKValue);
            // console.log('looking at relatedParentPKVals:', relatedParentPKVals);
            // console.log('isRelated?',isRelated);

            // If the buffer identity is related (as the parent) to the hydrated record,
            // rehydrate that record in the buffer.
            if (isRelated) {
              // console.log('    • hydrated 1 record from %s: "%s"',criteria.from.entity, criteria.from.identity);
              // console.log('Here\'s the record:\n %s', util.inspect(hydratedRecord, false, null));
              heap.rehydrate(_bufferIdent, [hydratedRecord]);
            }
            else {
              // console.log('   (-) SKIPPED record from %s: "%s"', criteria.from.entity, criteria.from.identity);
            }
          });

        });
      }

      // console.log('final hydrated results:',results);

      // We're done! The heap is up to date.

      // Still pass back the original set of `results` though, since they'll
      // be used to call the `parentFilterFn` and backfilter WHOSE subqueries.
      return cb(null, results);

    });
  });
}


module.exports = criteriaCursor;




/**
 * [_escapeForRegExpConstructor description]
 * @param  {[type]} text [description]
 * @return {[type]}      [description]
 */
function _escapeForRegExpConstructor (text) {
  var specials = [
    '/', '.', '*', '+', '?', '|',
    '(', ')', '[', ']', '{', '}', '\\'
  ];
  var rxp = new RegExp(
    '(\\' + specials.join('|\\') + ')', 'g'
  );
  return text.replace(rxp, '\\$1');
}

},{"assert":123,"async":89,"lodash":90,"root-require":99,"util":131,"waterline-criteria":102}],38:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var cursor = _dereq_('./cursor');


/**
 * #Query Engine
 *
 * The query engine traverses the given `criteria` tree and runs
 * each one recursively using the appropriate adapter(s), datastore(s),
 * and models(s) from the given query's ORM instance.
 *
 * The query engine generates a QueryHeap.  As each recursive step completes,
 * this function iteratively stores its results in the heap.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result stream.
 *
 * @param {Object} criteria
 * @param {Query} parentQuery        (note- may eventually just be `this`)
 * @param {Function} cb
 */

module.exports = function engine (criteria, parentQuery, cb) {

  // TODO: Try to acquire lock, if supported by datastores involved.

  // Point the cursor at the top-level criteria object, which will
  // evaluate it.
  //
  // NOTE:
  // Other sub-criteria will be iterated over recursively
  // as the cursor moves into the bowels of the criteria tree with each
  // step.
  //
  cursor({
    criteria: criteria,
    filter: null,
    query: parentQuery
  }, cb);

  // TODO: In `cb`, release lock, if one was acquired
  return;
};




},{"./cursor":37}],39:[function(_dereq_,module,exports){
module.exports = _dereq_('./Query');

},{"./Query":36}],40:[function(_dereq_,module,exports){
/**
 * Chainable access to the `limit` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __limit__ () {

  return this;
};

},{}],41:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');

var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');



/**
 * Setter method which provides RAW access to Query options.
 *
 * .options(), as well as all of the query modifier methods,
 * are useful at any point in the Query lifecycle up until data
 * is flowing (i.e. `.stream()` has been called)
 *
 * @param  {Object} additionalOptions
 * @return {Query}
 */
module.exports = function __options__ (additionalOptions) {
  _.merge(this, additionalOptions);
  return this;
};

},{"lodash":90,"root-require":99}],42:[function(_dereq_,module,exports){
/**
 * Chainable access to the `paginate` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __paginate__ () {

  return this;
};

},{}],43:[function(_dereq_,module,exports){
/**
 * Chainable access to the `populate` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __populate__ () {

  return this;
};

},{}],44:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');




/**
 * Chainable access to the `select` query modifier.
 *
 * @param  {Object|Array|String} _input
 * @return {Query}
 * @api public
 */

module.exports = function __select__ (_input) {
  var select = {};
  if (_.isString(_input)) {
    select[_input] = true;
  }
  else if (_.isArray(_input)) {
    select = _.reduce(_input, function arrayToObj(memo, attrName) {
      memo[attrName] = true;
      return memo;
    }, {});
  }
  else if (_.isObject(_input)) {
    select = _input;
  }
  this.criteria.select = _.merge(this.criteria.select, select);

  return this;
};

},{"lodash":90}],45:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');


/**
 * `Query.prototype.set()`
 *
 * A Query modifier method that allows users to specify
 * `values` or an array of `values` objects for use in
 * a `create` or `update` query.
 *
 * Sets Query's `values`, normalizing various input types
 * into a Readable stream of Records.
 *
 * @param {             userData
 *        Object
 *        Array{Object}
 *        Stream{Object}
 *        Record
 *        Array{Record}
 *        Stream{Record}
 *        RecordCollection
 *        }
 * @return {Query}
 */

module.exports = function __set__ (userData) {

  //TODO:

  // var incomingRecords;

  // if ( !_.isObject(userData) ) {
  //   throw new WLUsageError({ reason: 'Invalid usage of .set() modifier' });
  // }
  // else if (_.isArray(userData)) {
  //   // TODO: new up a RecordStream on the fly, emit all Records in order
  //   incomingRecords = new RecordStream();
  // }
  // else if (userData instanceof RecordStream) {
  //   // If `userData` is already a RecordStream, we're good.
  //   incomingRecords = userData;
  // }
  // else if (userData instanceof RecordCollection) {
  //   // TODO: new up a RecordStream on the fly, emit all Records in order
  //   incomingRecords = new RecordStream();
  // }
  // else if (userData instanceof Record) {
  //   // TODO: new up a RecordStream on the fly, emit the Record
  //   incomingRecords = new RecordStream();
  // }
  // else {
  //   // TODO: new up a RecordStream on the fly, emit the Record
  //   incomingRecords = new RecordStream();
  // }

  // this.options({
  //   values: incomingRecords
  // });

  // return this;
};

},{"root-require":99}],46:[function(_dereq_,module,exports){
/**
 * Chainable access to the `skip` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __skip__ () {

  return this;
};

},{}],47:[function(_dereq_,module,exports){
/**
 * Chainable access to the `sort` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __sort__ () {

  return this;
};

},{}],48:[function(_dereq_,module,exports){
/**
 * Chainable access to the `where` query modifier.
 *
 * @return {Query}
 * @chainable
 * @api public
 */

module.exports = function __where__ () {

  return this;
};

},{}],49:[function(_dereq_,module,exports){

/**
 * `parseResults()`
 *
 * TODO: since this method works w/ arrays, it can be
 * can be called on an array of results, a single result
 * (pass in [recordData]), or a stream of results (build a transform
 * stream which calls `parseResults()` with arrays of record data, or if
 * data events contain only single records, wrap them e.g. [recordData])
 *
 * Parses the results from a Query; but CURRENTLY only called when
 * records are to be returned as an array, i.e. not a stream.
 *
 * This default implementation may be overridden by passing
 * your own `parseResults` function in the Query constructor's
 * `opts` argument.
 *
 * @param  {RecordCollection} results
 * @return {RecordCollection}
 * @api private
 */
module.exports = function _ParseQueryResults (results) {
  return results;
};

},{}],50:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
// var Readable = require('stream').Readable;
var WLTransform = _dereq_('waterline-criteria');

var queryEngine = _dereq_('./engine');

// var RecordStream = require('../RecordStream');
// var Record = require('../../Record');

var lookupRelationFrom = _dereq_('root-require')('standalone/lookup-relation-from');
var WLError = _dereq_('root-require')('standalone/WLError');
var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');



/**
 * Run a Query.
 *
 * Functions as the "worker" function passed to the
 * Query's inherited Deferred constructor.
 *
 * @param  {Function} cb [description]
 * @return {Query}
 * @api private
 * @chainable
 */

module.exports = function run (cb) {
  var query = this;

  var relation;
  var criteria = this.criteria;

  // If a `worker` is not defined, and it can't be infered,
  // we must send back a usage error.
  if (!this.worker) {
    if (!this.orm) {
      cb(new WLUsageError(_dereq_('util').format('Cannot run Query on relation: "%s" - either a `worker` function or valid `orm` instance must be provided', criteria.from.identity)));
      return;
    }

    // But if an `orm` is available on the Query, we can infer
    // the `worker` function by determining the appropriate
    // adapter, datastore, and so forth.  An explicit `worker`
    // will always override the implicit one.
    else {
      relation = lookupRelationFrom(criteria.from, this.orm);
      //criteria.from ? query.orm.model(criteria.from) : (criteria.junction ? query.orm.junction(criteria.junction) : null);
      // console.log('running find on relation -->','\ncriteria.from:',criteria.from,'\ncriteria.junction:',criteria.junction);//,query.orm.junction('chatperson'));

      if (!relation) {
        // TODO:
        // consider just identifying the model automatically when this happens
        // (there are plus'es and minus'es to this)
        cb(new WLUsageError(_dereq_('util').format('Cannot run Query on relation: "%s" - no model or junction with that identity exists.  \n%s', criteria.from.identity, _dereq_('util').inspect(this) )));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - no model with that identity exists', criteria.from)));
      }

      //
      // || TODO: the usage error checking below can probably be eliminated in favor of
      // \/       an assertion inside of `Adapter.bridge()`
      //          (leaving it alone for now to avoid breaking things ~mike)
      //
      var adapter = relation.getAdapter();
      if (!adapter) {
        // TODO: bundle wl-memory and use it by default, when no other adapter is specified
        // (but emit a warning, b/c that could be confusing in some cases)
        // adapter = require('sails-memory');
        cb(new WLUsageError(_dereq_('util').format('Cannot run Query on relation: "%s" - its adapter is not specified or invalid`', criteria.from.identity)));
        return;
        // return this.orm.emit('error', new WLUsageError(require('util').format('Cannot run Query on model: "%s" - its adapter is not specified or invalid`', criteria.from)));
      }

      // If we made it here, our Query can infer the relation, desired method,
      // and therefore the adapter worker using its ORM instance:
      this.worker = function adapterWorkerFn (cb) {

        // TODO:
        // Call the appropriate raw function- one of:
        // -> _findRaw()
        // -> _destroyRaw()
        // -> _updateRaw()

        relation._findRaw(criteria, cb);
      };

      // In compatibility mode, if this query has joins, AND IF the
      // target adapter has a `join` method, we should build a worker
      // that calls the `_joinRaw` adapter bridge.
      // Also, the query should be flagged as `raw` and `preCombined` (to skip the integrator)
      if (this.orm && this.orm.compatibilityMode) {
        // console.log('~~~~~> IN COMPATIBILITY MODE');
        // var hasJoins = this.criteria.joins && this.criteria.joins.length;
        var adapterSupportsJoinMethod = relation && relation.getAdapter() && relation.getAdapter().join;
        var hasJoins = this.wl1Joins && this.wl1Joins.length;
        if (hasJoins && adapterSupportsJoinMethod) {
          // console.log('~~~~~> JOINS:', this.criteria.joins);
          this.raw = true;
          this.preCombined = true; // (this flag means "skip the integrator")

          // Mix joins back in to the criteria
          criteria.joins = this.wl1Joins;
          this.worker = function adapterWorkerFn(cb) {
            relation._joinRaw(criteria, cb);
          };
        }

        // Also, in compatibility mode, aggregation queries are always `raw` and `preCombined`
        if(this.criteria.groupBy || this.criteria.sum || this.criteria.average || this.criteria.min || this.criteria.max) {
          // They also need `limit`, `skip`, and `select` removed
          delete this.criteria.select;
          delete this.criteria.limit;
          delete this.criteria.skip;
          this.raw = true;
          this.preCombined = true;
        }
      }
    }

  }





  // Now, if we made it here- run the worker:


  // If `raw` is enabled, skip the query engine + integrator.
  if (this.raw) {
    // console.log('\n','-----=======-> Running raw query '+(this.purpose ? '(purpose: '+this.purpose+')': '')+':',this);
    this.worker(function (err, results) {
      if (err) return cb(err);

      if (_.isArray(results)) {

        // Fill in the query heap just to pacify tests and simplify WL1 integration
        // TODO: remove this requirement (optimization)
        // query.heap.malloc(criteria.from.identity, query.criteria);
        // query.heap.push(criteria.from.identity, results);
        // query.heap.malloc('root', query.criteria);
        query.heap.push('root', results);
      }

      // console.log('GOT RAW RESULTS:',results);
      return cb(null, results);
    });
  }

  // If `raw` is disabled (this is the default)
  // run the query engine and integrator.
  else {

    // No matter what, build an outgoing record stream
    // ...
    // var stream = new RecordStream();

    // If this query will be buffered, set up a container
    // to store the records in.
    var results;
    if (this.buffering) {
      results = [];
    }


    // Each time finalized records are available in the heap for us to use,
    // the Query will push stuff out
    // this.heap.on('batch', function (relationIdentity, someRecords) {

    //   // If this batch of records is NOT from the parent model,
    //   // we can simply ignore it.
    //   if (relationIdentity !== criteria.from.identity) {
    //     return;
    //   }

    //   // console.log('Heap emitted '+someRecords.length+ ' "'+ relationIdentity + '" records::',someRecords);

    //   // Run the integrator
    //   // ...
    //   someRecords = query.heap.integrate(someRecords);
    //   // (TODO)

    //   // New up Records
    //   // ...
    //   // someRecords = _.map(someRecords, function (values) {
    //   //   return new Record(relationIdentity, values);
    //   // });
    //   // (TODO)

    //   // Write records to outgoing record stream
    //   // ...
    //   // stream.push(someRecords);

    //   // If buffering, save records
    //   if (query.buffering) {
    //     results = results.concat(someRecords);
    //   }

    // });


    // When the engine is completely finished, end the output stream
    // and trigger the callback.
    queryEngine(this.criteria, this, function completelyDone(err) {

      // End the stream.
      // stream.push(null);

      // Snip off extra stuff stored in the heap
      // (note: we might be able to remove this and just not store the extra stuff, not sure)
      query.heap._buffers = _.mapValues(query.heap._buffers, function (buffer, key) {
        buffer.records = WLTransform.sort(buffer.records, buffer.sort||{});
        buffer.records = buffer.records.slice((buffer.skip || 0), (buffer.limit || 1000000) + (buffer.skip || 0));
        return buffer;
      });

      // Build up the result set by grabbing the root results out of the heap
      results = query.heap.get('root');

      // Manage flow control
      if (err) return cb(err);
      else if (query.buffering) {
        return cb(null, results);
      }
      else throw new WLError('`find()` streams not supported in WL2 yet');
      // else return cb(null, stream);
    });

  }


  // Chainable
  return this;
};


},{"./engine":38,"lodash":90,"root-require":99,"util":131,"waterline-criteria":102}],51:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');



/**
 * AssociationRule()
 *
 * Constructs an AssociationRule.
 *
 * @param {Object} definition
 *                    -> relation: {Relation}
 *                    -> attrName: {String}
 *                    -> ...
 * @constructor
 */

function AssociationRule (definition) {

  // Make `this.parent` non-enumerable
  Object.defineProperty(this, 'parent', { enumerable: false, writable: true });

  // Merge properties into the AR instance itself,
  // unless they are already defined.
  _mergeDefaults(this, definition);

  // Remember original `attrDef`
  this.attrDef = this.parent.attributes[this.attrName]||{};

  // ---------------------------------------------------------------------------------------------------------------------------------------
  // Summary of the things an AR must define to support `find()`:
  //   1. Given a set of parents, return a function which will return only those parents which are related to one or more children.
  //   2. Given a set of children, return a function which will return only those children which are related to one or more parents.
  //   3. Given a set of parents and a criteria, transform the criteria to find child records who are related to one or more parents.
  // ---------------------------------------------------------------------------------------------------------------------------------------

  // Mix in default association rule definition
  _.defaults(this, {

    /**
     * Identify any junctions introduced by this association rule in
     * the parent ontology (i.e. `orm`).
     */

    refresh: function () {

      // // hack for development only:
      // if (this.attrName === 'recipients') {
      //   var junctionIdentity = 'chatperson';
      //   this.parent.orm.junction(junctionIdentity, {

      //     // By default, store the junction in the relation's datastore
      //     datastore: this.parent.datastore
      //   });
      //   console.log('identifying junction:', junctionIdentity, this.parent.orm.junction(junctionIdentity).datastore);
      // }
    },



    /**
     * Build a child criteria tree to use in the recursive step.
     *
     * For example, assuming `attrName === "chatHistory"`, and given
     * the subtree (`originalChildCriteria`):
     *
     * ```
     * {
     *   from: 'chat',
     *   select: {
     *     message: true
     *   },
     *   where: {
     *     flaggedAsOffensive: true
     *   }
     * }
     * ```
     *
     * getCriteria() would return a modified/"wrapped" subcriteria
     * which is context-dependent, e.g.:
     *
     * ```
     * {
     *   junction: 'chat_user',
     *   select: {
     *     chat: {
     *       from: 'chat',
     *       select: {
     *         message: true
     *       },
     *       where: {
     *         flaggedAsOffensive: true
     *       }
     *     }
     *   },
     *   where: {
     *     user: [1,2,3,4,5,8,9,32,1045,93223,16,30]
     *   }
     * }
     * ```
     *
     * Warning:
     * This is a hot code path.  It is called by the query
     * engine every time it runs a query. Should avoid
     * deep-cloning if possible.
     *
     * @param  {Object[]} parentBatchResults
     * @param  {Criteria} originalChildCriteria
     * @return {Criteria}
     *
     * @nosideeffects
     */
    getCriteria: function (parentBatchResults, originalChildCriteria) {
      var id = this.id ? '('+this.id+') ' : '';
      throw new Error('getCriteria() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule '+id+'yet');
      // NOTE: parentBatchResults were NOT filtered using
      //
      // TODO: actually build the child criteria
      // return {
      //   junction: 'chatperson'
      // };
    },


    /**
     * Build an in-memory filter function to run on each batch
     * of cursor results retrieved in the NEXT RECURSIVE STEP.
     * (e.g. where the transformed criteria tree built by `getCriteria()`
     * is being used)
     *
     * For example, if I wanted to find chats sent by a user named "Dan",
     * I would use the following criteria:
     * ```
     * {
     *   from: 'chat',
     *   where: {
     *     user: {
     *       whose: { name: 'Dan' }
     *     }
     *   }
     * }
     * ```
     * So after fetching a batch of chats, the query engine will take the
     * recursive step and starts fetching batches of user candidates (who might
     * be named Dan),  to "interview" them, if you will.  But before doing that,
     * it runs `getWhoseFilter()` to get a function that will be called on each
     * batch of users.  In this case, the returned function would return only
     * users that are named "Dan".  This makes the recursive child cursor aware
     * of which users match the parent subquery (its `filteredBatchResults`).
     * When the child cursor finishes with each of ITS nested selects (i.e. joins),
     * it will compare its `filteredBatchResults` against the subset of results
     * it received from ITS recursive call for that association.  It is in this
     * way that we can perform subqueries of infinite depth (e.g. chat's from a user
     * named Dan whose mom's name is Kathy whose brother's name is Dominick).
     * Finally, the results from that second filtering replace the original
     * `parentBatchResults`, and are eventually pushed into a private queryheap
     * for the child cursor when all associations are finished.  That
     * private queryheap grows with each batch of child results, and then finally
     * the engine is finished searching through:
     * <<<users named Dan associated with the current batch of chats>>>
     * The private queryheap is then pushed into the top-level queryheap so that
     * it will be available to the integrator.
     *
     *
     * @param  {Object[]} filteredParentBatchResults
     * @param  {Criteria} originalChildCriteria
     * @return {Function}
     *
     * @nosideeffects
     * @hotcodepath
     */
    getChildFilter: function (filteredParentBatchResults, originalChildCriteria) {
      throw new Error('getChildFilter() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule yet');
      /**
       * @param  {Object[]} childResults
       * @return {Object[]} subset of `childResults`
       */
      return function _childFilter (childResults){
        // TODO: actually do something
        // (btw this function is equivalent to the memfilter in the current criteria cursor impl)
        return childResults;
      };
    },


    /**
     * This is the "second filtering" mentioned above.
     * (i.e. in the parent cursor, the logic that compares the parent's
     * `filteredBatchResults` against the child cursor results received
     * for a particular association
     *
     * Should return a subset of `filteredParentResults`
     *
     * TODO: call this function in the criteria cursor
     *
     * @nosideeffects
     * @hotcodepath
     */
    getParentFilter: function (filteredParentBatchResults, originalChildCriteria, originalQuery) {
      throw new Error('getParentFilter() not implemented for "'+this.parent.identity+'.'+this.attrName+'"\'s association rule yet');
      /**
       * @param  {Object[]} childResults
       * @return {Object[]} a subset of `filteredParentBatchResults`
       */
      return function _parentFilter (childResults) {
        // TODO: actually do something
        return filteredParentBatchResults;
      };
    },


    /**
     * Execute DDL to modify the underlying physical collection(s)
     * as-needed to make this association rule work.
     *
     * IMPORTANT:
     * This must be an idempotent operation, as it should be possible
     * for `migrate()` to be called repeatedly, even at runtime.  The
     * `migrate()` for association rules is called *AFTER* the `migrate()`
     * for all relations has finished.
     */
    migrate: function () {

      // Waterline's built-in association types:
      // (logical-layer)
      // ============================================================
      //
      // • (A) model
      // • (B) collection
      // • (C) model..via..model
      // • (D) collection..via..model
      // • (E) model..via..collection
      // • (F) collection..via..collection


      // Waterline's built-in association persistence strategies:
      // (physical-layer)
      // ============================================================
      //
      // •  1.fk <---> 1.fk   -    (C)    - Both sides "hasOne" using their own foreign key &† must be manually synced. [one-to-one]                                           (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)
      //
      // •   N <---  1.fk     -  (A|D|E)  - One side "hasOne" using a foreign key and the other side "hasMany" through backreference &† automatically in-sync. [one-to-many]
      //
      // •     N <-J-> M      -   (B|F)   - Both sides "hasMany" through backreference to a Junction w/ two foreign keys &† automatically in-sync  [many-to-many]
      //
      // •   N[fk]  ---> M    -    (B)    - One side "hasMany" using an array of FKs &† automatically in-sync. [many-to-many]
      //
      // •  N[fk]  ---> M.fk  - (A|D|E|B) - One side "hasMany" using an array of FKs and the other "hasOne" using a foreign key &† must be manually synced. [one-to-many]      (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)
      //
      // • N[fk] <---> M[fk]  -    (F)    - Both sides "hasMany" using arrays of FKs &† must be manually synced. [many-to-many]                                                (NOTE: THIS USAGE IS NON-IDEAL AND IS NOT A PRIORITY FOR IMPLEMENTATION)



      // Note on association rules and logical meaning vs. physical persistence:
      //
      // The physical representation of some logical association types is
      // identical to others.  However the association rules are slightly
      // different since, just because the physical representation is the
      // same doesn't mean you can query them the same way.  That is all
      // dependent on which side you start from.  Also the logical association
      // type impacts whether both sides are automatically kept in sync (i.e. `via`),
      // and whether removed records are deleted or soft-deleted (i.e. `cascade`).


      // TODO: actually migrate the association
      throw new Error('Not implemented yet');
    },


    /**
     * Called when Waterline wants to completely replace/set/override/wipe
     * the contents of this association and replace them with a new set of
     * records.
     *
     * TODO: figure this out: should it return a set of operations...?
     *
     */
    replace: function (newSetOfRecords) {
      throw new Error('Not implemented yet');
    },

    /**
     * Called when Waterline wants to add new record(s) to this association.
     * Note that the record must already exist (have been `.create()`'ed) within
     * a relation.  If the record already belongs to this association, this method
     * should leave it alone.
     *
     * TODO: figure this out: should it return a set of operations...?
     *
     */
    add: function (recordsToAdd) {
      throw new Error('Not implemented yet');
    },

    /**
     * Called when Waterline wants to remove record(s) from this association.
     * Note that the record will not be destroyed- it will just no longer show
     * up as a member of this association.
     *
     * TODO: figure this out: should it return a set of operations...?
     *
     */
    remove: function (recordsToRemove) {
      throw new Error('Not implemented yet');
    }
  });

}


/**
 * `this.getOtherRelation()`
 *
 * @return {Relation}
 */
AssociationRule.prototype.getOtherRelation = function () {
  switch (this.attrDef.association.entity) {
    case 'model':
      return this.parent.orm.model(this.attrDef.association.identity);
    case 'junction':
      return this.parent.orm.junction(this.attrDef.association.identity);
  }
};



module.exports = AssociationRule;

},{"lodash":90,"merge-defaults":91}],52:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');

var Relation = _dereq_('./Relation');

var WLEntity = _dereq_('root-require')('standalone/WLEntity');



/**
 * Construct a Junction.
 * (in WL1, this was just another Collection)
 *
 * A Junction is a special, private model used by Waterline to implement
 * association rules in the relational style.  Junctions are completely
 * optional, but are the default strategy for persisting plural relationships,
 * both 1-way (N-->M) and 2-way (N<->M).
 *
 * @constructor
 * @implements {Relation}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Junction (definition) {

  // Call superclass constructor (Relation)
  Junction.super_.apply(this, [definition]);

}

// Qualifier
Junction.isJunction = WLEntity.qualifier;

// Junction implements Relation.
util.inherits(Junction, Relation);


module.exports = Junction;

},{"./Relation":54,"root-require":99,"util":131}],53:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');

var Relation = _dereq_('./Relation');

var WLEntity = _dereq_('root-require')('standalone/WLEntity');



/**
 * Construct a Model.
 * (aka WL1 "Collection")
 *
 * Each Model instance starts off with a `definition`, which typically
 * includes the identity of the Datastore where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @implements {Relation}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Model (definition) {

  // Call superclass constructor (Relation)
  Model.super_.apply(this, [definition]);
}

// Model implements Relation.
util.inherits(Model, Relation);

// Qualifier
Model.isModel = WLEntity.qualifier;


/**
 * #Model.prototype.getModel()
 *
 * @return {Model}
 *
 * @api public
 */

Model.prototype.getModel = function getModel () {
  return this;
};

module.exports = Model;

},{"./Relation":54,"root-require":99,"util":131}],54:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');

var WLEntity = _dereq_('root-require')('standalone/WLEntity');
var prettyInstance = _dereq_('root-require')('standalone/pretty-instance');


/**
 * Relation
 *
 * Constructs a Relation, the abstract parent class for Model and Junction.
 * (i.e. you shouldn't ever need/want to "new up" a Relation directly)
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 * @constructor
 * @abstract
 */
function Relation (definition) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  definition = definition || {};
  _mergeDefaults(definition, {
    attributes: {}
  });

  // Merge properties into the Relation instance itself,
  // unless they are already defined.
  _mergeDefaults(this, definition);

  // Set entity type (might be 'junction' or 'model')
  this.entity = this.constructor.name.toLowerCase();

}


// Qualifier
Relation.isRelation = WLEntity.qualifier;



// Accessor methods
Relation.prototype.getAdapter = _dereq_('./accessors/getAdapter');
Relation.prototype.getDatastore = _dereq_('./accessors/getDatastore');
Relation.prototype.getRelation = _dereq_('./accessors/getRelation');

// Access an association rule
Relation.prototype.getAssociationRule = _dereq_('./accessors/getAssociationRule');

// Semantics
Relation.prototype.query = _dereq_('./query');
Relation.prototype.transaction = _dereq_('./transaction');
Relation.prototype.bootstrap = _dereq_('./bootstrap');
Relation.prototype.refresh = _dereq_('./refresh');

// Base CRUD methods
Relation.prototype.find = _dereq_('./bridge/find');
Relation.prototype.create = _dereq_('./bridge/create');
Relation.prototype.update = _dereq_('./bridge/update');
Relation.prototype.destroy = _dereq_('./bridge/destroy');

// Convenience methods
Relation.prototype.findOne = _dereq_('./bridge/findOne');

// Compound methods
Relation.prototype.findOrCreate = _dereq_('./bridge/findOrCreate');
Relation.prototype.updateOrCreate = _dereq_('./bridge/updateOrCreate');

// DDL methods
Relation.prototype.describe = _dereq_('./bridge/describe');
Relation.prototype.drop = _dereq_('./bridge/drop');
Relation.prototype.addField = _dereq_('./bridge/addField');
Relation.prototype.removeField = _dereq_('./bridge/removeField');

// Raw private methods
// -- These should not be used directly; the API may change. --
// -- You have been warned! --
Relation.prototype._findRaw = _dereq_('./bridge/_findRaw');
Relation.prototype._findAndJoinRaw = _dereq_('./bridge/_findAndJoinRaw');
Relation.prototype._findWhoseRaw = _dereq_('./bridge/_findWhoseRaw');
Relation.prototype._updateRaw = _dereq_('./bridge/_updateRaw');
Relation.prototype._destroyRaw = _dereq_('./bridge/_destroyRaw');
Relation.prototype._createRaw = _dereq_('./bridge/_createRaw');

// Raw private methods EXCLUSIVELY for adapters implementing
// the original (<2.0.0) Waterline adapter API
Relation.prototype._joinRaw = _dereq_('./bridge/_joinRaw');
Relation.prototype._createEachRaw = _dereq_('./bridge/_createEachRaw');


/**
 * #Relation.prototype.inspect()
 *
 * @return {String} that will be used when displaying
 *                  a Relation instance via `util.inspect`,
 *                  `console.log`, etc.
 *
 * @api private
 */

Relation.prototype.inspect = function inspectRelation () {
  var props = {
    attributes: this.attributes
  };
  if (this.datastore) { props.datastore = this.datastore; }
  if (this.getAdapter()) { props.adapter = this.getAdapter().identity; }
  var className = this.constructor.name;
  return prettyInstance(this, props, className+' <'+(this.globalID || this.identity)+'>');
};


module.exports = Relation;

},{"./accessors/getAdapter":55,"./accessors/getAssociationRule":56,"./accessors/getDatastore":57,"./accessors/getRelation":58,"./bootstrap":59,"./bridge/_createEachRaw":60,"./bridge/_createRaw":61,"./bridge/_destroyRaw":62,"./bridge/_findAndJoinRaw":63,"./bridge/_findRaw":64,"./bridge/_findWhoseRaw":65,"./bridge/_joinRaw":66,"./bridge/_updateRaw":67,"./bridge/addField":68,"./bridge/create":69,"./bridge/describe":70,"./bridge/destroy":71,"./bridge/drop":72,"./bridge/find":73,"./bridge/findOne":74,"./bridge/findOrCreate":75,"./bridge/removeField":76,"./bridge/update":77,"./bridge/updateOrCreate":78,"./query":85,"./refresh":86,"./transaction":87,"lodash":90,"merge-defaults":91,"root-require":99}],55:[function(_dereq_,module,exports){
/**
 * #Relation.prototype.getAdapter()
 *
 * Look up the adapter instance used by this model's datastore.
 *
 * @return {Adapter}
 *
 * @api public
 */

module.exports = function getAdapter () {
  try {
    return this.getDatastore().getAdapter();
  }
  catch (e) {
    return null;
  }
};

},{}],56:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');





/**
 * #Relation.prototype.getAssociationRule()
 *
 * Get the association rule for the given attribute.
 *
 * @this  {Relation}
 * @param  {String} attrName
 * @return {AssociationRule}
 * @api private
 */

module.exports = function getAssociationRule (attrName) {
  // console.log('For',this.identity, '(a '+this.entity+'), this.associationRules ==>',this.associationRules);
  return _.find(this.associationRules, { attrName: attrName });
};


},{"lodash":90}],57:[function(_dereq_,module,exports){
/**
 * #Relation.prototype.getDatastore()
 *
 * Look up the datastore instance this model belongs to.
 *
 * @return {Datastore}
 *
 * @api public
 */

module.exports = function getDatastore () {
  try {
    return this.orm.getDatastore(this.datastore);
  }
  catch (e) {
    return null;
  }
};

},{}],58:[function(_dereq_,module,exports){
/**
 * #Relation.prototype.getRelation()
 *
 * @return {Relation}
 *
 * @api public
 */

module.exports = function getRelation () {
  return this;
};

},{}],59:[function(_dereq_,module,exports){
/**
 * #Relation.prototype.bootstrap()
 *
 * Replace all existing records in the relation's underlying physical
 * collection with new records built from the provided dataset.
 *
 * @param {Object[]} dataset
 * @param {Function} cb
 *
 * @api public
 */

module.exports = function bootstrapRelation (dataset, cb){
  cb(new Error('Not implemented yet!'));
};

},{}],60:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._createEachRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `createEach()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.create([{...}, {...}]).options({raw: true})
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
      label: 'attrValues[]',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'createEach',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'attrValues[]', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'attrValues[]', 'callback']
  }
});

},{"../../Adapter":12}],61:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._createRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `create()`
 * method of an adapter directly, use `SomeModel.create().options({raw: true})`
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
      label: 'attrValues',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'create',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'attrValues', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'attrValues', 'callback']
  }
});

},{"../../Adapter":12}],62:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._destroyRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `destroy()`
 * method of an adapter directly, use `SomeModel.destroy().options({raw: true})`
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
  adapterMethod: 'destroy',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'criteria', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});

},{"../../Adapter":12}],63:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._findAndJoinRaw()`
 *
 * ONLY SUPPORTED FOR ADAPTERS IMPLEMENTING THE >= v2.0.0 WATERLINE ADAPTER API.
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `findAndJoin()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.find().populate('someAssociation').options({raw: true})
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
  adapterMethod: 'findAndJoin',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});

},{"../../Adapter":12}],64:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._findRaw()`
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
  adapterMethod: 'find',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'criteria', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});

},{"../../Adapter":12}],65:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


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

},{"../../Adapter":12}],66:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._joinRaw()`
 *
 * ONLY SUPPORTED FOR ADAPTERS IMPLEMENTING THE ORIGINAL (<2.0.0) WATERLINE ADAPTER API.
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `join()`
 * method of an adapter directly, use:
 * ```
 * SomeModel.find().populate('someAssociation')
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
  adapterMethod: 'join',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'criteria', 'callback']
  }
});

},{"../../Adapter":12}],67:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype._updateRaw()`
 *
 * A function that communicates w/ the underlying adapter.
 * Should not be called directly in userland-- to call the `update()`
 * method of an adapter directly, use `SomeModel.update().options({raw: true})`
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
      label: 'attrValues',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'update',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'criteria', 'attrValues', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'criteria', 'attrValues', 'callback']
  }
});

},{"../../Adapter":12}],68:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype.addField()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'fieldName',
      type: 'string'
    },
    {
      label: 'field definition',
      type: 'object'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'addField',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'fieldName', 'field definition', 'callback']
  }
});

},{"../../Adapter":12}],69:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.create()`
 *
 * @return {Query}
 */
module.exports = function create ( /* values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],70:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype.describe()`
 *
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'describe',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'callback']
  }
});

},{"../../Adapter":12}],71:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.destroy()`
 *
 * @return {Query}
 */
module.exports = function ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],72:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype.drop()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'drop',
  adapterUsage: {
    '<2.0.0': ['Datastore.identity', 'Model.cid', 'callback'],
    '>=2.0.0': ['Datastore', 'Model.cid', 'callback']
  }
});

},{"../../Adapter":12}],73:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.find()`
 *
 * @return {Query}
 */

module.exports = function find ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  var criteria = arguments[0];
  var callback = arguments[1];
  // ****************************************

  // Instantiate a Query
  var query = this.query({
    criteria: criteria
  });

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],74:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.findOne()`
 *
 * @return {Query}
 */
module.exports = function findOne ( /* criteria, callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query({

    // Pass in custom logic to marshal the expected results
    // from the adapter for this particular method
    // (this is CURRENTLY [May 20, 2014] only called for non-streaming usage)
    parseResults: function (results) {
      return results[0];
    }
  });

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],75:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.findOrCreate()`
 *
 * @return {Query}
 */
module.exports = function findOrCreate ( /* criteria, values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],76:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Adapter = _dereq_('../../Adapter');


/**
 * `Relation.prototype.removeField()`
 *
 * @type {Function}
 * @api public
 * @return {Deferred}
 */

module.exports = Adapter.bridge({
  usage: [
    {
      label: 'fieldName',
      type: 'string'
    },
    {
      label: 'callback',
      type: 'function',
      optional: true
    }
  ],
  adapterMethod: 'removeField',
  adapterUsage: {
    '>=2.0.0': ['Datastore', 'Model.cid', 'fieldName', 'callback']
  }
});

},{"../../Adapter":12}],77:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.update()`
 *
 * @return {Query}
 */
module.exports = function update ( /* criteria, values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],78:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var Query = _dereq_('../../Query');



/**
 * `Relation.prototype.updateOrCreate()`
 *
 * @return {Query}
 */

module.exports = function updateOrCreate ( /* criteria, values[], callback */ ) {

  // ****************************************
  // TODO: normalize usage/arguments
  // ****************************************

  // Instantiate a Query
  var query = new Query();

  // If `criteria` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (criteria) {
    query.options({ criteria: criteria });
  }

  // If `values` was specified, it's like calling the relevant
  // Query modifier method(s) immediately.
  if (values) {
    query.options({ values: values });
  }

  // If `callback` was specified, call `.exec()` immediately.
  if (callback) query.exec(callback);

  return query;
};

},{"../../Query":39}],79:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var WLTransform = _dereq_('waterline-criteria');

var flattenClause = _dereq_('root-require')('standalone/flatten-criteria-clause');
var extractSubTree = _dereq_('root-require')('standalone/extract-criteria-subtree');
var pruneUndefined = _dereq_('root-require')('standalone/prune-undefined');


/**
 * hasFK
 *
 * Default association rule for `model` associations
 * (aka the "hasOne" or "•-->1" relationship)
 */

module.exports = {

  // Currently, `identity` is only included for advisory purposes only
  // (i.e. it's not used elsewhere in the code base)
  identity: 'hasFK',


  /**
   * Build a function which, given a hypothetical child record,
   * return the records in `parentBatchResults` that would be
   * considered its "parents".
   *
   * @param  {Array} parentBatchResults
   * @return {Function}
   */

  buildGetRelatedFn: function (parentBatchResults) {

    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();
    var attrName = this.attrName;

    /**
     * Given a hypothetical future child record, return the records from
     * the current set that would be considered its "parent".
     * @param  {Object} futureChildRecord
     * @return {Array}
     */
    return function _getRelated (futureChildRecord) {
      return _.where(parentBatchResults, function (parentRecord) {
        return parentRecord[attrName] === futureChildRecord[childRelation.primaryKey];
      });
    };
  },


  /**
   * In this type of association (i.e. "hasOne"), the foreign key is
   * either the primary key value of a child record, or null/undefined.
   * Each parent record references precisely 0 or 1 child records.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {

    // console.log('---***** TRANSFORMING CRITERIA IN hasFK (AR) ****---');
    // console.log('parentBatchResults',parentBatchResults);
    // console.log('---- old criteria -----','\n',require('util').inspect(originalChildCriteria, false, null),'\n------- / -------\n');

    // Use the original (though normalized) child criteria as our starting point
    var newCriteria = _.cloneDeep(originalChildCriteria);

    // The attribute name is used as our foreign key
    //
    // Note: a `fieldName` (aka columnName) may be specified
    // in the attribute definition for this association and it
    // will be used again.  This mapping is handled transparently
    // in Adapter.bridge().
    var foreignKey = this.attrName;
    // console.log('my parent', this.parent.identity);
    // console.log('my parents attributes', this.parent.attributes);
    // console.log('My attribute name is ',this.attrName);
    var otherRelation = this.getOtherRelation();

    // Pluck the foreign key values from the parent batch results
    // then strip records where a foreign key is undefined
    // (since we can safely ignore them)
    var childRecordPKValues;
    childRecordPKValues = _.pluck(parentBatchResults, foreignKey);
    // console.log('parentBatchResults', parentBatchResults);
    // console.log('childRecordPKValues', childRecordPKValues);
    childRecordPKValues = pruneUndefined(childRecordPKValues);
    // console.log('foreignKey', foreignKey);

    // Look for child records where their primary key is === to the
    // relevant foreign key value from one of the parent records in this batch.
    newCriteria.where[otherRelation.primaryKey] = childRecordPKValues;
    // console.log('otherRelation.identity', otherRelation.identity);
    // console.log('otherRelation.primaryKey', otherRelation.primaryKey);
    // console.log('newCriteria.where (before merging w/ old):', newCriteria.where);

    // Merge in the WHERE clause from the original criteria
    // (i.e. could be the top-level WHERE or "select..where")
    // (in some cases, it may not be passed down due to the nature of a query)
    newCriteria.where = _.merge(newCriteria.where, flattenClause(originalChildCriteria.where));

    // console.log('---- new criteria -----','\n',require('util').inspect(newCriteria, false, null),'\n------- / -------\n');

    return newCriteria;
  },


  /**
   * getChildFilter()
   *
   * Return a function which will be used to filter each batch of child results
   * returned from the raw page queries within the recursive step.
   *
   * The primary purpose of this filter is for *POPULATE* (select..select)
   * i.e. to exclude child records which are NOT associated with this batch
   * of parent results.
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Object} childCriteria
   * @param  {Object} parentCriteria
   * @return {Function}
   */
  getChildFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    var foreignKey = this.attrName;
    var otherRelation = this.getOtherRelation();

    // Lookup subqueries for simpler access
    var parentSubqueries = extractSubTree(parentCriteria, 'where');
    var parentSubquery = parentSubqueries[this.attrName];


    /**
     * @param  {Object[]} childBatchResults
     * @return {Object[]} subset of `childBatchResults`
     */
    return function _childFilter(childBatchResults) {

      ///////////////////////////////////////////////////////////////////////////
      // Actually we can't safely do this all the time.
      //
      // We can't safely remove these records if the parent criteria has a WHOSE
      // subquery that it uses for qualifying its own records, but actually still
      // populates all of the child results (even those which would fail the WHOSE
      // subquery filter.)
      //
      // <optimization>
      // Do this in for queries where it is possible to reduce the total # of
      // raw `.find()`s
      // </optimization>
      //
      // TODO: pull this code out into the criteria cursor so it doesn't have to
      // exist in every AR.
      //
      ///////////////////////////////////////////////////////////////////////////
      // Eliminate `childBatchResults` records who fail a match against
      // the WHOSE subquery clause from the previous recursive step:
      // var childBatchResultsWhose;
      // if (parentSubquery && parentSubquery.whose) {
      //   childBatchResultsWhose = WLTransform(childBatchResults, {where: parentSubquery.whose}).results;
      // }
      // else childBatchResultsWhose = childBatchResults;
      ///////////////////////////////////////////////////////////////////////////

      // Find the parent results linked to these childBatchResults
      // (since in a hasFK association, the parent result holds the foreign key)
      var childPKValues = _.pluck(childBatchResults, otherRelation.primaryKey);
      var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childPKValues, parentResult[foreignKey]);
      });

      // Now that we have the linked parent results from this batch, we can
      // use them to look up ALL of the possible child results:
      childBatchResults = _.where(childBatchResults, function (subResult) {
        return _.contains(_.pluck(linkedParentResults, foreignKey), subResult[otherRelation.primaryKey]);
      });

      // TODO: (optimization)
      // On the other hand, if the query does NOT have a nested select on
      // this attribute, we only need to keep the child records found as
      // part of the parentSubquery (`subResultWhose`) instead of the entire set
      // of all associated child records (`childBatchResults`)

      return childBatchResults;
    };
  },


  /**
   * Return a function which will be used to filter each batch of parent results
   * using child results returned from the recursive step.  This allows us to
   * use a subquery, while still including the full set of child results
   * e.g. find people who have a dog named "fred" (but populate ALL of their dogs)
   *
   * This filter can also be referred to as a "back-filter", since it changes the
   * parent result set based on the results from the child cursor (i.e. recursive
   * step.)
   *
   * The primary purpose of this filter is for *WHOSE* (`where.whose` subqueries)
   * i.e. to backfilter parent records which did not match the subquery condition.
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Array} childCriteria
   * @param  {Object} parentCriteria
   */
  getParentFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    var foreignKey = this.attrName;
    var otherRelation = this.getOtherRelation();

    /**
     * @param  {Object[]} filteredChildResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredChildResults) {
      var childPKs = _.pluck(filteredChildResults, otherRelation.primaryKey);

      // `bfPBRs` stands for "back-filtered parent batch results"
      var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childPKs, parentResult[foreignKey]);
      });

      // Return the subset of parent results which link
      // to a record in `filteredChildResults`
      return bfPBRs;
    };
  }

};

},{"lodash":90,"root-require":99,"waterline-criteria":102}],80:[function(_dereq_,module,exports){
module.exports = {};

},{}],81:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');
var WLTransform = _dereq_('waterline-criteria');

var flattenClause = _dereq_('root-require')('standalone/flatten-criteria-clause');
var extractSubTree = _dereq_('root-require')('standalone/extract-criteria-subtree');
var pruneUndefined = _dereq_('root-require')('standalone/prune-undefined');


/**
 * viaFK
 *
 * Default association rule for "collection via model" associations
 * (aka the "belongsToMany" or "•<--N" relationship)
 *
 * In this type of association (i.e. "belongsToMany"), the foreign key(s) are
 * stored on the child record(s) (it is also very possible that none exist for
 * a given parent record.) Each parent record references between 0 and ∞ child records.
 *
 */

module.exports = {

  // Currently, `identity` is only included for advisory purposes only
  // (i.e. it's not used elsewhere in the code base)
  identity: 'viaFK',


  /**
   * Build a function which, given a hypothetical child record,
   * return the records in `parentBatchResults` that would be
   * considered its "parents".
   *
   * @param  {Array} parentBatchResults
   * @return {Function}
   */

  buildGetRelatedFn: function (parentBatchResults) {

    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();
    var viaAttrName = this.attrDef.association.via;

    /**
     * Given a hypothetical future child record, return the records from
     * the current set that would be considered its "parent".
     * @param  {Object} futureChildRecord
     * @return {Array}
     */
    return function _getRelated (futureChildRecord) {
      return _.where(parentBatchResults, function (parentRecord) {
        return parentRecord[parentRelation.primaryKey] === futureChildRecord[viaAttrName];
      });
    };
  },

  /**
   * Get child criteria.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {

    // Build up a set of pk values from parent batch results
    // to use as the criteria for the child query.
    //
    // e.g. [2,3,4,5,6,7,8,9]
    var parentPKValues = _.pluck(parentBatchResults, this.parent.primaryKey);
    parentPKValues = pruneUndefined(parentPKValues);

    // The attribute on the other relation that this association
    // references with its `via` property is used as our foreign key.
    //
    // Note: a `fieldName` (aka columnName) may be specified
    // in the attribute definition on the other relation, and it will
    // be used without us doing anything further.  This is thanks to
    // transparent mapping in Adapter.bridge().
    //
    // e.g. "owner"
    var foreignKeyOnOtherRelation = this.attrDef.association.via;

    // Now use all that to build the transformed criteria object:
    var newCriteria = originalChildCriteria;

    // Ensure WHERE clause exists
    originalChildCriteria.where = originalChildCriteria.where||{};

    // Have newCriteria find child records where:
    // child[fk] =IN= parents[pk]
    // e.g.
    // {
    //   owner: [2,3,4,5,6,7,8,9]
    // }
    newCriteria.where[foreignKeyOnOtherRelation] = newCriteria.where[foreignKeyOnOtherRelation]||parentPKValues;

    // Merge in the WHERE clause from the original criteria
    // (i.e. could be the top-level WHERE or "select..where")
    // (in some cases, it may not be passed down due to the nature of a query)
    newCriteria.where = _.merge(newCriteria.where, flattenClause(originalChildCriteria.where));

    // console.log('\n\n\n-------------------\nvia-fk '+this.attrName+':',newCriteria);
    // console.log('foreignKeyOnOtherRelation:', foreignKeyOnOtherRelation);
    // console.log('parentBatchResults:', util.inspect(parentBatchResults, false, null));
    return newCriteria;
  },


  /**
   * getChildFilter()
   *
   * Return a function which will be used to filter each batch of child results
   * returned from the raw page queries within the recursive step.
   *
   * The purpose of this filter is mainly to exclude child records which are
   * NOT associated with this batch of parent results.
   *
   * Still don't completely understand why this one has to exist..??
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Object} childCriteria
   * @param  {Object} parentCriteria
   * @return {Function}
   */
  getChildFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    // var foreignKey = this.attrName;
    // var otherRelation = this.getOtherRelation();

    // // Lookup subqueries for simpler access
    // var parentSubqueries = extractSubTree(parentCriteria, 'where');
    // var parentSubquery = parentSubqueries[this.attrName];

    var parentPK = this.parent.primaryKey;
    var childFK = this.attrDef.association.via;

    /**
     * @param  {Object[]} childBatchResults
     * @return {Object[]} subset of `childBatchResults`
     */
    return function _childFilter(childBatchResults) {

      // Find the parent results linked to these childBatchResults
      // (since in a hasFK association, the parent result holds the foreign key)
      var childFKValues = _.pluck(childBatchResults, childFK);
      var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
        return _.contains(childFKValues, parentResult[parentPK]);
      });

      // Now that we have the linked parent results from this batch, we can
      // use them to look up ALL of the possible child results:
      childBatchResults = _.where(childBatchResults, function (childRecord) {
        return _.contains(_.pluck(linkedParentResults, parentPK), childRecord[childFK]);
      });

      return childBatchResults;
    };
  },


  /**
   * Return a function which will be used to filter each batch of parent results
   * using child results returned from the recursive step.  This allows us to
   * use a subquery, while still including the full set of child results
   * e.g. find people who have a dog named "fred" (and populate ALL of their dogs)
   *
   * This filter can also be referred to as a "back-filter", since it changes the
   * parent result set based on the results from the child cursor (i.e. recursive
   * step.)
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Array} childCriteria
   * @param  {Object} parentCriteria
   */
  getParentFilter: function(filteredParentBatchResults, childCriteria, parentCriteria) {

    // Parent primary key
    // e.g. `id`
    var parentPK = this.parent.primaryKey;

    // The relevant foreign key on the child relation
    // i.e. this is the attribute on the child relation which
    // references *ME* (the current association rule on the parent relation.)
    var childForeignKey = this.attrDef.association.via;

    /**
     * @param  {Object[]} filteredChildResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredChildResults) {
      // console.log('\n[--in viaFk parentFilter--]');
      // console.log('Filtering filteredParentBatchResults:',filteredParentBatchResults);

      // Using our "via", pluck foreign key values from the child results.
      // e.g. [1,2,3,4,5,6]
      var childFKValues = _.pluck(filteredChildResults, childForeignKey);
      // console.log('using filteredChildResults FKs:',childFKValues);
      // console.log('parentPK:',parentPK);

      // Exclude parent batch results which are not connected to at least
      // one child result.
      var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
        // console.log('checking that:',parentResult[parentPK]);
        // console.log('',parentResult);
        return _.contains(childFKValues, parentResult[parentPK]);
      });

      // `bfPBRs` stands for "back-filtered parent batch results"
      // Formally, `bfPRs` is a subset containing those parent results
      // which link to at least one record in `filteredChildResults`
      // console.log('to get bfPBRs:',bfPBRs);
      return bfPBRs;
    };
  }
};

},{"lodash":90,"root-require":99,"util":131,"waterline-criteria":102}],82:[function(_dereq_,module,exports){
module.exports=_dereq_(80)
},{}],83:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var util = _dereq_('util');
var _ = _dereq_('lodash');
var WLTransform = _dereq_('waterline-criteria');

var flattenClause = _dereq_('root-require')('standalone/flatten-criteria-clause');
var extractSubTree = _dereq_('root-require')('standalone/extract-criteria-subtree');
var pruneUndefined = _dereq_('root-require')('standalone/prune-undefined');
var WLError = _dereq_('root-require')('standalone/WLError');





/**
 * viaJunctor
 *
 * Default association rule for "collection via collection" and
 * "via-less collection" association types.
 * (aka the "hasAndBelongsToMany", or [•]<-J->N relationship)
 *
 * In this type of association:
 * • the foreign key(s) are stored in an intermediate Junction relation
 * • Each record in the junction maps a single parent record to a single
 *   child record (and potentially vice-versa, if both a "via-link" can
 *   be established.)
 * • Each parent record references between 0 and ∞ child records.
 */

module.exports = {

  // Currently, `identity` is only included for advisory purposes only
  // (i.e. it's not used elsewhere in the code base)
  identity: 'viaJunctor',

  // TODO: name this AR `viaJunctor` for consistency
  // (b/c it is not necessarily dealing w/ Junctions [i.e. private models], rather
  // it contains logic for dealing with ANY relation which is being USED as a junctor,
  // i.e. it could be referring to models or junctions for any of the 3 involved relations.)

  /**
   * Build a function which, given a hypothetical child record,
   * return the records in `parentBatchResults` that would be
   * considered its "parents".
   *
   * @param  {Array} parentBatchResults
   * @param  {Query} query
   * @param  {String} qpath
   * @return {Function}
   */

  buildGetRelatedFn: function (parentBatchResults, query, qpath) {

    var orm = this.parent.orm;
    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();
    var attrDef = this.attrDef;
    var attrName = this.attrName;
    var viaAttrName = this.attrDef.association.through.via;

    /**
     * Given a hypothetical future child record, return the records from
     * the current set that would be considered its "parent".
     * @param  {Object} futureChildRecord
     * @return {Array}
     */
    return function _getRelated (futureChildRecord) {
      // console.log(
      //   'Running `getRelated()` using the `viaJunctor` AR for '+attrName+' within qpath: '+qpath+
      //   '\nLooking for child record:',
      //   futureChildRecord,
      //   '\n & the parent batch results are: ',
      //   parentBatchResults,
      //   '\n & the primary key:',
      //   parentRelation.primaryKey,
      //   '\n & the viaAttrName:',
      //   viaAttrName,
      //   '\n & the through `onto`:',attrDef.association.through.onto
      // );

      // TODO: expand this to work w/ junctions (not just models)
      var adjoiningRelation = orm.model(attrDef.association.through.identity);
      var adjoiningBufferIdentity = qpath+'.'+
      attrName+'['+futureChildRecord[childRelation.primaryKey]+'].'+
      '&'+adjoiningRelation.entity+'_'+adjoiningRelation.identity+'_'+attrDef.association.through.onto;
      // console.log('adjoiningBufferIdentity:',adjoiningBufferIdentity);
      var adjoiningBuffer = query.heap.get(adjoiningBufferIdentity);


      return _.where(parentBatchResults, function (parentRecord) {
        return _.any(adjoiningBuffer,function (joinRecord) {
          return joinRecord[attrDef.association.through.via] === parentRecord[parentRelation.primaryKey] &&
            joinRecord[attrDef.association.through.onto] === futureChildRecord[childRelation.primaryKey];
        });
      });
    };
  },


  /**
   * Make any necessary changes to the parent ORM's ontology to reflect
   * the current state of this association rule.
   *
   * For our purposes in this AR, that means locating or introducing
   * new junction relations.
   */
  refresh: function () {
    var parent = this.parent;
    var orm = parent.orm;
    var attrName = this.attrName;
    var attrDef = this.attrDef;

    var parentRelation = this.parent;
    var childRelation = this.getOtherRelation();

    // assert -> attrDef.association.through

    // The `through` sub-object contains identifying metadata about the relation
    // which will be used to store and retrieve intermediate records for this
    // association.

    // This `adjoiningRelation` could be a Junction (private) or model (app-level)
    // relation which connects 0 or more parent records to 0 or more child records.
    this.adjoiningRelation = (function _lookupInterRelation () {
      // console.log(attrName+':',util.inspect(attrDef, false, null));
      switch (attrDef.association.through.entity) {

        // If `adjoiningRelation` is a model, it must already have an identity.
        // Just look it up and expose it as `this.adjoiningRelation`.
        case 'model':

          // TODO:
          // if things like `dominant` or `database` were specified,
          // we should emit a warning informing the architect that they're
          // not going to work, since the settings of the model itself will take
          // precendence.
          // console.log('in viaJunctor AR for "%s.%s", looking for adjoining relation "%s" in models',parent.identity, attrName, attrDef.association.through.identity);
          // console.log('parent:',parent);
          // console.log('orm',orm);
          // console.log('all models:',orm.models);

          // console.log('THROUGH:',attrDef.association.through.identity);
          var throughModel = orm.model(attrDef.association.through.identity);
          if (!throughModel) return undefined;
          // console.log('models:', orm.models);
          // console.log('junctions:', orm.junctions);

          // While we're here, also go ahead and add an explicit virtual attribute
          // to the other side of this many-to-many association
          // (this is crucial for accurate querying)
          var virtualAssocName = '&'+throughModel.entity+'_'+throughModel.identity+'_'+attrDef.association.through.onto;
          var virtualAssocDef = {
            association: {
              entity: throughModel.entity,
              identity: throughModel.identity,
              plural: true,
              via: attrDef.association.through.onto
            }
          };
          childRelation.attributes[virtualAssocName] = virtualAssocDef;

          // childRelation.virtualAssociations = childRelation.virtualAssociations||[];
          // The relations won't be refreshed agian, so register the virtual association
          // right away.
          // var virtualAssoc = _.cloneDeep(virtualAssocDef);
          // virtualAssoc.name = virtualAssocName;
          // childRelation.virtualAssociations.push(virtualAssoc);

          // All ready!
          return throughModel;

        // If `adjoiningRelation` is a junction, we'll try to look it up, but if
        // it doesn't exist already, we'll instantiate and identify it.
        case 'junction':

          // Prevent unintentional consequences of using anonymous junctions
          // in WL1 (compatibilityMode)
          if (orm.compatibilityMode) {
            return;
            // throw new WLError('Private junctions not allowed in compatibility mode.');
          }

          // If `through.identity` is not specified, we'll (deterministically)
          // make one up.
          attrDef.association.through.identity = attrDef.association.through.identity ||
          (function _determineadjoiningRelationIdentity() {
            return 'pIdentity_pAttrname_cIdentity__cIdentity_cAttrName';
          })();

          // `datastore`
          //
          // The datastore that will be used to persist metadata for this
          // association, in lieu of a foreign key existing on either side
          // of the relationship. Currently, metadata stored in this way
          // is always a physical collection which represents a logical
          // junction.
          //
          // This option looks at the `dominant` property, but a custom datastore
          // may also be directly specified as `datastore`.
          attrDef.association.through.datastore = attrDef.association.through.datastore||
          (function _determineJunctionDatastore (){

            // Otherwise, if this AR has the `dominant` flag set, use the parent
            // relation's datastore.
            if (attrDef.association.dominant) {
              return self.datastore.identity;
            }
            // If not, use the child relation's datastore.
            else {
              return attrDef.association.identity;
            }

          })();


          // So now we'll (re)instantiate the junction.
          // This could be optimized to use the old one if it exists, but
          // since we'd need to merge in any options which might have changed,
          // it's not really all that different from just recreating it
          // (and in fact it might be slower)
          orm.junction(attrDef.association.through.identity, {

            schema: true,

            datastore: attrDef.association.through.datastore,

            attributes: (function _buildJunctionSchema () {
              var _attrs = {};

              var foreignKeyToParent = 'pIdentity_pAttrname_cIdentity';
              var foreignKeyToChild  = 'cIdentity_cAttrName';

              // Foreign key -> to parent relation
              _attrs[foreignKeyToParent] = {
                association: {
                  entity: parentRelation.entity,
                  identity: parentRelation.identity,
                  plural: false
                }
              };

              // Foreign key -> to child relation
              _attrs[foreignKeyToChild] = {
                association: {
                  entity: attrDef.association.entity,
                  identity: attrDef.association.identity,
                  plural: false
                }
              };

              return _attrs;

            })()

          });

          // Then return the newly identified junction relation.
          return orm.junction(attrDef.association.through.identity);
      }
    })();

    // If an adjoining relation could not be determined just give up.
    // A reasonable error will be shown at query time.
    // (this is important for WL1 compatibility w/i the `operation-shim`)
    if (!this.adjoiningRelation){
      return;
    }

  },



  /**
   * Get child criteria.
   *
   * @param  {Array} parentBatchResults
   * @param  {Object} originalChildCriteria
   * @return {Object}
   */
  getCriteria: function(parentBatchResults, originalChildCriteria) {

    // Ensure that this function does not mutate the originalChildCriteria
    originalChildCriteria = _.cloneDeep(originalChildCriteria);
    // console.log('---- old criteria -----','\n',require('util').inspect(originalChildCriteria, false, null),'\n------- / -------\n');

    var attrName = this.attrName;
    var attrDef = this.attrDef;
    var parentRelation = this.parent;
    var adjoiningRelation = this.adjoiningRelation;
    var childRelation = this.getOtherRelation();
    var fkToParentOnJunctor = this.attrDef.association.through.via;
    var fkToChildOnJunctor = this.attrDef.association.through.onto;
    var assocToParentOnChild = this.attrDef.association.via;
    // (function (){
    //   // TODO: clean this up
    //   var orm.model();
    //   this.attrDef.association.through.onto;
    // })();
    // console.log('fkToParentOnJunctor',fkToParentOnJunctor);
    // console.log('fkToChildOnJunctor',fkToChildOnJunctor);

    // console.log('childRelation:',childRelation.identity);
    // console.log('adjoiningRelation:',adjoiningRelation.identity);
    // console.log('parentRelation:',parentRelation.identity);

    // Build up a set of pk values from parent batch results
    // to use in the criteria below.
    //
    // e.g. [2,3,4,5,6,7,8,9]
    var parentPKValues = _.pluck(parentBatchResults, this.parent.primaryKey);
    parentPKValues = pruneUndefined(parentPKValues);

    // Build a virtual attribute which references the appropriate
    // junctor directly from the child.
    var assocToJunctor =
      '&'+adjoiningRelation.entity+'_'+
      adjoiningRelation.identity+'_'+
      fkToChildOnJunctor;

    // TODO:
    // Try out the new approach of querying the child (i.e. destination) relation
    // directly and building a subquery to the junctor in the WHERE clause in
    // the child select
    // (e.g. find drivers, and for each one select taxis where t.e. permits whose
    // "_driver" is in the batch of pk values from this driver batch.  Then, the
    // pk values each taxi batch will be added **LATER** to the WHERE clause as a
    // feature of the association rule between taxis and permits. If no such association
    // exists [i.e. this is one way and there is no taxi.drivers or taxi.permits], we'll
    // use a virtual attribute, e.g. &through|driver|taxis|0 which will have the appropriate
    // AR, from, select, and where assigned at runtime.  We could really just always use
    // the latter approach- and in fact it would make the code cleaner)

    // Now use all that to build the transformed criteria object:
    var newCriteria;

    // Build junction table criteria around the original child criteria
    newCriteria = {

      from: {
        entity: childRelation.entity,
        identity: childRelation.identity
      },

      limit: originalChildCriteria.limit,
      skip: originalChildCriteria.skip,
      sort: originalChildCriteria.sort,

      // Intermediate wrapper criteria must inherit limit/skip/sort
      // from the child criteria...?
      // limit: originalChildCriteria.limit,
      // skip: originalChildCriteria.skip,
      // sort: originalChildCriteria.sort,

      // Build WHERE clause so that junction records
      // are filtered using a subquery (in the antagonistic case,
      // is implemented by yet another paging cursor(s), but
      // ideally, this allows the relevant database to execute
      // a single native query if both the junctor relation and
      // the child relation live in the same datastore)
      where: (function _buildWhere() {
        var _where = {};

        // Merge in original child criteria where (many-to-many populate..where)
        _.merge(_where,originalChildCriteria.where);

        _where[assocToJunctor] = {
          min: 1,
          whose: {}
        };
        _where[assocToJunctor].whose[fkToParentOnJunctor] = parentPKValues;

        return _where;
      })(),

      select: (function _buildJunctorSelect() {

        var __select = {
          '*': true
        };


        // TODO: merge original select in, but make sure the crucial parts
        // so far (i.e. the '*':true) don't get smashed.  If *:false is in
        // original select, calculate the inverted projection so it's compatible
        // with `'*':true` and merge that in
        // __selectoriginalChildCriteria.select,


        // Build grandchild select clause
        __select[assocToJunctor] = {

          from: {
            entity: adjoiningRelation.entity,
            identity: adjoiningRelation.identity
          },

          where: (function _buildWhere() {
            var _where = {};
            _where[fkToParentOnJunctor] = parentPKValues;

            return _where;
          })()

          // ----- ------

          //-- update june5 --
          // Actually I think we want the AR within the junctor to figure
          // this grandchild where clause out for us..
          // where: {}
          // --- ----

          //   // The where criteria for the final (grand?)child relation
          // where: (function _buildJunctionWhere(){

          //   // TODO: this needs work- should merge in the populate..where criteria
          //   // but not the criteria w/ the fks from the junction step

          //   var __where = originalChildCriteria.where;
          //   __where[attrDef.association.via] = parentPKValues;
          //   return __where;
          // })(),
        };
        return __select;

      })()
    };

    // console.log('-------------------\nvia-junctor '+this.attrName+':',util.inspect(newCriteria, false, null), '\n------- / -------\n');

    return newCriteria;
  },


  /**
   * getChildFilter()
   *
   * Return a function which will be used to filter each batch of child results
   * returned from the raw page queries within the recursive step.
   *
   * The purpose of this filter is mainly to exclude child records which are
   * NOT associated with this batch of parent results.
   *
   * Still don't completely understand why this one has to exist..??
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Object} childCriteria
   * @param  {Object} parentCriteria
   * @return {Function}
   */
  getChildFilter: function(filteredParentBatchResults /*unused:::, childCriteria, parentCriteria */) {

    // var foreignKey = this.attrName;
    // var otherRelation = this.getOtherRelation();

    // // Lookup subqueries for simpler access
    // var parentSubqueries = extractSubTree(parentCriteria, 'where');
    // var parentSubquery = parentSubqueries[this.attrName];

    var parentPK = this.parent.primaryKey;
    var childFK = this.attrDef.association.through.via;


    // Actually these child results are now from the child, not the junctor
    return function (childBatchResults){
      return childBatchResults;
    };

    /**
     * @param  {Object[]} junctionBatchResults
     * @return {Object[]} subset of `junctionBatchResults`
     */
    // return function _childFilter(junctionBatchResults) {

    //   // Find the parent results linked to these junctionBatchResults
    //   // (since in a hasFK association, the parent result holds the foreign key)
    //   var childFKValues = _.pluck(junctionBatchResults, childFK);
    //   var linkedParentResults = _.where(filteredParentBatchResults, function (parentResult) {
    //     return _.contains(childFKValues, parentResult[parentPK]);
    //   });

    //   // Now that we have the linked parent results from this batch, we can
    //   // use them to look up ALL of the possible child results:
    //   junctionBatchResults = _.where(junctionBatchResults, function (childRecord) {
    //     return _.contains(_.pluck(linkedParentResults, parentPK), childRecord[childFK]);
    //   });

    //   return junctionBatchResults;
    // };
  },


  /**
   * Return a function which will be used to filter each batch of parent results
   * using child results returned from the recursive step.  This allows us to
   * use a subquery, while still including the full set of child results
   * e.g. find people who have a dog named "fred" (and populate ALL of their dogs)
   *
   * This filter can also be referred to as a "back-filter", since it changes the
   * parent result set based on the results from the child cursor (i.e. recursive
   * step.)
   *
   * @param  {Array} filteredParentBatchResults
   * @param  {Array} childCriteria
   * @param  {Object} parentCriteria
   */
  getParentFilter: function(filteredParentBatchResults /*unused::, childCriteria, parentCriteria */) {

    // Parent primary key
    // e.g. `id`
    var parentPK = this.parent;

    // The relevant foreign key on the child relation
    // i.e. this is the attribute on the child relation which
    // references *ME* (the current association rule on the parent relation.)
    // var childForeignKey = this.attrDef.association.through.via();

    /**
     * @param  {Object[]} filteredJunctionResults
     *                     • the FINAL set of ALL child results from the recursive
     *                       step, AFTER an in-memory filter has been run.
     *
     * @return {Object[]} a subset of `filteredParentBatchResults`
     */
    return function _parentFilter(filteredChildResults) {

      return filteredParentBatchResults;
      // // Using our "via", pluck foreign key values from the child results.
      // // e.g. [1,2,3,4,5,6]
      // var childFKValues = _.pluck(filteredJunctionResults, childForeignKey);

      // // Exclude parent batch results which are not connected to at least
      // // one child result.
      // var bfPBRs = _.where(filteredParentBatchResults, function (parentResult) {
      //   return _.contains(childFKValues, parentResult[parentPK]);
      // });

      // // `bfPBRs` stands for "back-filtered parent batch results"
      // // Formally, `bfPRs` is a subset containing those parent results
      // // which link to at least one record in `filteredJunctionResults`
      // return bfPBRs;
    };
  }
};



},{"lodash":90,"root-require":99,"util":131,"waterline-criteria":102}],84:[function(_dereq_,module,exports){
module.exports=_dereq_('./Relation');

},{"./Relation":54}],85:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');


/**
 * Factory method to generate a new generic Waterline Query pointed
 * at this model/junction (i.e. presets the "from" or "junction" property)
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 *
 * @api public
 */
module.exports = function query (opts, worker) {
  opts = _mergeDefaults(opts || {}, {
    criteria: {}
  });

  if (this.constructor.name === 'Junction') {
    opts.criteria.junction = this.identity;
  }
  else {
    opts.criteria.from = this.identity;
  }

  return this.orm.query(opts, worker);
};

},{"lodash":90,"merge-defaults":91}],86:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var _mergeDefaults = _dereq_('merge-defaults');

var WLUsageError = _dereq_('root-require')('standalone/WLError/WLUsageError');


/**
 * Relation.prototype.refresh()
 *
 * Refresh this relation's datastore, adapter, associations and related
 * metadata (i.e. keys/junctions/associated relations) as well as any other
 * future configuration.  Should be run on participating relations whenever
 * the ontology changes.
 *
 * @chainable
 * @return {Relation}
 *
 * @api private
 */

module.exports = function refresh () {
  // console.log('\n\n********\n\nREFRESHING',this.identity);//, 'and its attributes:',this.attributes);

  // Closure access to `orm`,`identity`,etc. for use below
  var orm = this.orm;
  var identity = this.identity;
  var self = this;

  // Ensure ORM is known -- cannot refresh() without it.
  if (!orm) {
    throw new WLUsageError(util.format('Relation "%s" is not attached to an ORM', identity));
  }

  // Locate the adapter and datastore for this relation.
  var adapter = this.getAdapter();
  var datastore = this.getDatastore();

  // Default the `schema` flag based on the adapter's configuration
  if (adapter) {
    this.schema = this.schema||datastore.schema||adapter.schema||false;
  }

  // Determine this model's primary key, default to `id`
  this.primaryKey = this.primaryKey||'id';

  // TODO:
  // deprecate the `primaryKey` attribute option and replace it with a
  // top-level model property (`primaryKey`).
  // This is fine to do since, for most adapters, only one attribute can
  // be the primary key anyway.  And we can support any future multi-PK
  // stuff by allowing `somemodel.primaryKey` to be either a string (for
  // a single PK attribute) or an array of strings (for multiple pk attrs)

  // Normalize the definition of this relation and each of its attributes:
  // `tableName`+`cid`+`identity` --> `cid`
  this.cid = this.cid||this.tableName||this.identity;
  // console.log('ATTRS:',this.attributes,'\n---------*********----------');
  this.attributes = _.reduce(this.attributes, function (memo, attrDef, attrName) {

    // WL1-compatibility:
    // Tolerate non-object attribute definitions
    // (in WL1, some attributes on junctions are undefined)
    // For now, just ignore these undefined attribute definitions:
    if (!_.isObject(attrDef)) {
      return memo;
    }


    // console.log('--------------------\nNORMALIZING ATTRDEF for "'+attrName+'":::::',attrDef);
    // console.log('fieldName ==> ', attrDef.fieldName);
    // `columnName`+`fieldName`+attrName --> `fieldName`

    // Ensure a fieldName is known or inferred
    // (unless this is a collection association)
    if (!(attrDef.association && attrDef.association.collection)) {
      attrDef.fieldName = attrDef.fieldName||attrDef.columnName||attrName;
    }

    // console.log('AFTER::::::',attrDef,'\n--------------------');
    // `model` --> `association: { plural: false, entity: 'model', identity: '...' }`
    if (attrDef.model) {
      attrDef.association = _mergeDefaults(attrDef.association||{}, {
        entity: 'model',
        identity: attrDef.model,
        plural: false
      });
    }
    // `collection` --> `association: { plural: true, entity: 'model', identity: '...' }`
    else if (attrDef.collection) {

      attrDef.association = attrDef.association||{};

      // Support string syntax for `through`
      if (_.isString(attrDef.through)) {
        // console.log('Expanded `through` (%s) in %s.%s',attrDef.through, identity, attrName);
        attrDef.association.through = {
          entity: 'model',
          identity: attrDef.through
        };
        delete attrDef.through;
      }

      attrDef.association = _mergeDefaults(attrDef.association, {
        entity: 'model',
        identity: attrDef.collection,
        plural: true
      });

      // Take a second pass:
      attrDef.association = _mergeDefaults(attrDef.association, {

        // `via`
        //
        // The name of the foreign key attribute on the other relation
        // referenced by this association.
        //
        // This option is only relevant for certain ARs (i.e. if this
        // association is persisted via backreference to a foreign key
        // attribute stored on another relation) But we have to normalize
        // it either way, since we don't know which AR this association
        // will use yet.
        via: attrDef.via,


        // `through`
        //
        // Metadata the junction table used in this association.
        //
        // These options are only relevant for certain ARs (i.e. if this
        // association will manage a junction) But we have to normalize
        // them either way, since we don't know which AR this association
        // will use yet.
        through: {

          // May be overridden to be `model`
          entity: 'junction',

          // `through.identity` and `through.datastore` will be determined
          // when the relevant AR is refreshed (since we don't necessarily
          // have the relevant models and/or junctions yet.)
        }

      });
    }


    // Remove top-level `collection`, `model`, `dominant, and `via` properties
    // to make sure there is exactly ONE authoritative method of accessing this
    // metadata across core: the `attrDef.association` sub-object
    delete attrDef.model;
    delete attrDef.collection;
    delete attrDef.via;
    delete attrDef.dominant;

    // Save the normalized definition and continue.
    memo[attrName] = attrDef;
    return memo;
  },{});

  // Locate an array of associations for this relation by examining each attribute.
  this.associations = _.reduce(this.attributes, function (memo, attrDef, attrName) {

    // Ignore primitive attributes
    // (TODO: consider..? maybe there's a use case for not doing this? e.g. mongo embeds?)
    if (!attrDef.association) return memo;

    // Save as an association (after tagging w/ the attrName)
    else {
      attrDef.name = attrName;
      memo.push(attrDef);
      return memo;
    }
  }, []);

  // NOTE:
  // None of the above takes care of determining the default,
  // built-in association rule to use, which must be calculated
  // after ALL of the relations have been refreshed.
  //
  // See the definition of `ORM.prototype.refresh()` for that.

  return this;
};


},{"lodash":90,"merge-defaults":91,"root-require":99}],87:[function(_dereq_,module,exports){
/**
 * #Relation.prototype.transaction()
 *
 * Build an atomic version of this relation in order to perform
 * some async transactional logic.
 *
 * @param  {Function} cb  ({AtomicRelation}, {Function})
 * @return {Deferred}
 *
 * @api private
 */

module.exports = function getTransactional (cb){
  cb(new Error('Not implemented yet!'));
};

},{}],88:[function(_dereq_,module,exports){
/**
 * Waterline()
 *
 * Factory which instantiates an ORM instance, bootstraps
 * the ontology using provided options, refreshes the schema,
 * and then returns the ready-to-go ORM for use.
 *
 * @param  {Object} opts
 * @return {ORM}
 */

function Waterline (opts) {
  var orm = new Waterline.ORM(opts);
  orm.refresh();
  return orm;
}


// Exposes core constructors for clean usage throughout
// WL core, plugin authors, monkeypatching, etc.
Waterline.ORM       = _dereq_('./ORM');
Waterline.Relation  = _dereq_('./Relation');
Waterline.Model     = _dereq_('./Relation/Model');
Waterline.Datastore = _dereq_('./Datastore');
Waterline.Adapter   = _dereq_('./Adapter');
Waterline.Query     = _dereq_('./Query');
Waterline.Deferred  = _dereq_('root-require')('standalone/Deferred');

// Exposes errors
Waterline.WLError            = _dereq_('root-require')('standalone/WLError');
Waterline.WLUsageError       = _dereq_('root-require')('standalone/WLError/WLUsageError');
Waterline.WLValidationError  = _dereq_('root-require')('standalone/WLError/WLValidationError');

// Synonyms
Waterline.Error              = Waterline.WLError;
Waterline.UsageError         = Waterline.WLUsageError;
Waterline.ValidationError    = Waterline.WLValidationError;

// Case folding
Waterline.Orm                = Waterline.ORM;

module.exports = Waterline;

},{"./Adapter":12,"./Datastore":23,"./ORM":31,"./Query":39,"./Relation":84,"./Relation/Model":53,"root-require":99}],89:[function(_dereq_,module,exports){
(function (process){
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,_dereq_("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":128}],90:[function(_dereq_,module,exports){
(function (global){
/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],91:[function(_dereq_,module,exports){
var _ = _dereq_('lodash');

/**
 * defaultsDeep
 *
 * Implement a deep version of `_.defaults`.
 *
 * This method is hopefully temporary, until lodash has something
 * similar that can be called in a single method.  For now, it's
 * worth it to use a temporary module for readability.
 * (i.e. I know what `_.defaults` means offhand- not true for `_.partialRight`)
 */

// In case the end user decided to do `_.defaults = require('merge-defaults')`,
// before doing anything else, let's make SURE we have a reference to the original
// `_.defaults()` method definition.
var origLodashDefaults = _.defaults;

// Corrected: see https://github.com/lodash/lodash/issues/540
// module.exports = function (/* ... */) {
  
//   if (typeof arguments[0] !== 'object') return origLodashDefaults.apply(_, Array.prototype.slice.call(arguments));
//   else {
//     var result = _mergeDefaults.apply(_, Array.prototype.slice.call(arguments));

//     // Ensure that original object is mutated
//     _.merge(arguments[0], result);

//     return result;
//   }
// };

module.exports = _.partialRight(_.merge, function recursiveDefaults ( /* ... */ ) {

  // Ensure dates and arrays are not recursively merged
  if (_.isArray(arguments[0]) || _.isDate(arguments[0])) {
    return arguments[0];
  }
  return _.merge(arguments[0], arguments[1], recursiveDefaults);
});

//origLodashDefaults.apply(_, Array.prototype.slice.call(arguments));

// module.exports = _.partialRight(_.merge, _.defaults);

// module.exports = _.partialRight(_.merge, function deep(a, b) {
//   // Ensure dates and arrays are not recursively merged
//   if (_.isArray(a) || _.isDate(a)) {
//     return a;
//   }
//   else return _.merge(a, b, deep);
// });
},{"lodash":92}],92:[function(_dereq_,module,exports){
module.exports=_dereq_(90)
},{}],93:[function(_dereq_,module,exports){
module.exports = {

  // Used to identify a function as a switchback.
  telltale: {
    key: '_TELLTALE',
    value: 'a94hgd9gal2gl2bmc,=1aga'
  }
};

},{}],94:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */
var util = _dereq_('util');
var _ = _dereq_('lodash');
var constants = _dereq_('./constants');



/**
 * factory
 *
 * @return {Switchback}
 *
 * An anonymous function is used as the base for switchbacks so that
 * they are both dereferenceable AND callable.  This allows functions
 * which accept switchback definitions to maintain compatibility with
 * standard node callback conventions (which are better for many situations).
 *
 * This also means that instantiated switchbacks may be passed interchangably
 * into functions expecting traditional node callbacks, and everything will
 * "just work".
 */

module.exports = function(callbackContext) {

  var _switch = function( /* err, arg1, arg2, ..., argN */ ) {
    var args = Array.prototype.slice.call(arguments);

    // Trigger error handler
    var err = args[0];
    if (err) {
      return _switch.error.apply(callbackContext || this, args);
    }
    return _switch.success.apply(callbackContext || this, args.slice(1));
  };

  // Mark switchback function so it can be identified for tests
  _switch[constants.telltale.key] = constants.telltale.value;

  // Mix in non-enumerable `.inspect()` method
  Object.defineProperty(this, 'inspect', { enumerable: false, writable: true });
  _switch.inspect = function () { return '[Switchback]'; };

  return _switch;
};

},{"./constants":93,"lodash":90,"util":131}],95:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */
var _ = _dereq_('lodash');
var util = _dereq_('util');
var factory = _dereq_('./factory');
var normalize = _dereq_('./normalize');
var redirect = _dereq_('./redirect');
var wildcard = _dereq_('./wildcard');
var constants = _dereq_('./constants');
var EventEmitter = _dereq_('events').EventEmitter;


/**
 * `switchback`
 *
 * Switching utility which builds and returns a handler which is capable
 * calling one of several callbacks.
 *
 * @param {Object|Function} callback
 *			- a switchback definition obj or a standard 1|2-ary node callback function.
 * @param {Object} [defaultHandlers]
 *			- '*': supply a special callback for when none of the other handlers match
 *			- a string can be supplied, e.g. {'invalid': 'error'}, to "forward" one handler to another
 *			- otherwise a function should be supplied, e.g. { 'error': res.serverError }
 * @param {Object} [callbackContext]
 *			- optional `this` context for callbacks
 */

var switchback = function(callback, defaultHandlers, callbackContext) {

  // Track whether a single tick of the event loop has elapsed yet since
  // this switchback was instantiated.
  var atLeastOneTickHasElapsed;
  setTimeout(function (){
    atLeastOneTickHasElapsed = true;
  }, 0);

  // Build switchback
  var Switchback = factory(callbackContext);

  // If callback is not a function or an object, I don't know wtf it is,
  // so let's just return early before anything bad happens, hmm?
  if (!_.isObject(callback) && !_.isFunction(callback)) {
    // Actually let's not.
    // Instead, make the new switchback an EventEmitter
    var e = new EventEmitter();
    Switchback.emit = function() {
      var args = Array.prototype.slice.call(arguments);

      // This will invoke the final runtime function
      //
      // But first ensure at least a single cycle of the event loop has elapsed
      // since this switchback was instantiated
      if (atLeastOneTickHasElapsed) {
        return e.emit.apply(e, args);
      }
      else {
        setTimeout(function (){
          return e.emit.apply(e, args);
        }, 0);
      }
    };
    Switchback.on = function(evName, handler) {
      return e.on.apply(e, Array.prototype.slice.call(arguments));
    };

    // Then emit the appropriate event when the switchback is triggered.
    callback = {
      error: function(err) {
        Switchback.emit('error', err);
      },
      success: function( /*...*/ ) {
        Switchback.emit.apply(e, ['success'].concat(Array.prototype.slice.call(arguments)));
      }
    };
  }



  // Normalize `callback` to a switchback definition object.
  callback = normalize.callback(callback, callbackContext);

  // Attach specified handlers
  _.extend(Switchback, callback);



  // Supply a handful of default handlers to provide better error messages.
  var getWildcardCaseHandler = function(caseName, err) {
    return function unknownCase( /* ... */ ) {
      var args = Array.prototype.slice.call(arguments);
      err = (args[0] ? util.inspect(args[0]) + '        ' : '') + (err ? '(' + (err || '') + ')' : '');

      if (_.isObject(defaultHandlers) && _.isFunction(defaultHandlers['*'])) {
        return defaultHandlers['*'](err);
      } else throw new Error(err);
    };
  };

  // redirect any handler defaults specified as strings
  if (_.isObject(defaultHandlers)) {
    defaultHandlers = _.mapValues(defaultHandlers, function(handler, name) {
      if (_.isFunction(handler)) return handler;

      // Closure which will resolve redirected handler
      return function() {
        var runtimeHandler = handler;
        var runtimeArgs = Array.prototype.slice.call(arguments);
        var runtimeCtx = callbackContext || this;

        // Track previous handler to make usage error messages more useful.
        var prevHandler;

        // No more than 5 "redirects" allowed (prevents never-ending loop)
        var MAX_FORWARDS = 5;
        var numIterations = 0;
        do {
          prevHandler = runtimeHandler;
          runtimeHandler = Switchback[runtimeHandler];
          // console.log('redirecting '+name+' to "'+prevHandler +'"-- got ' + runtimeHandler);
          numIterations++;
        }
        while (_.isString(runtimeHandler) && numIterations <= MAX_FORWARDS);

        if (numIterations > MAX_FORWARDS) {
          throw new Error('Default handlers object (' + util.inspect(defaultHandlers) + ') has a cyclic redirect.');
        }

        // Redirects to unknown handler
        if (!_.isFunction(runtimeHandler)) {
          runtimeHandler = getWildcardCaseHandler(runtimeHandler, '`' + name + '` case triggered, but no handler was implemented.');
        }

        // Invoke final runtime function
        //
        // But first ensure at least a single cycle of the event loop has elapsed
        // since this switchback was instantiated
        if (atLeastOneTickHasElapsed) {
          runtimeHandler.apply(runtimeCtx, runtimeArgs);
        }
        // Otherwise wait until that happens and then invoke the runtime function
        else {
          setTimeout(function (){
            runtimeHandler.apply(runtimeCtx, runtimeArgs);
          }, 0);
        }

      };
    });
  }

  _.defaults(Switchback, defaultHandlers, {
    success: getWildcardCaseHandler('success', '`success` case triggered, but no handler was implemented.'),
    error: getWildcardCaseHandler('error', '`error` case triggered, but no handler was implemented.'),
    invalid: getWildcardCaseHandler('invalid', '`invalid` case triggered, but no handler was implemented.')
  });

  return Switchback;
};


/**
 * `isSwitchback`
 *
 * @param  {*}  something
 * @return {Boolean}           [whether `something` is a valid switchback instance]
 */
switchback.isSwitchback = function(something) {
  return _.isObject(something) && something[constants.telltale.key] === constants.telltale.value;
};


module.exports = switchback;

},{"./constants":93,"./factory":94,"./normalize":96,"./redirect":97,"./wildcard":98,"events":126,"lodash":90,"util":131}],96:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */
var _ = _dereq_('lodash');
var util = _dereq_('util');



module.exports = {


  /**
   * `normalize.callback( callback )`
   *
   * If `callback` is provided as a function, transform it into
   * a "Switchback Definition Object" by using modified copies
   * of the original callback function as error/success handlers.
   *
   * @param  {Function|Object} callback [cb function or switchback def]
   * @return {Object}                   [switchback def]
   */
  callback: function _normalizeCallback(callback, callbackContext) {

    if (_.isFunction(callback)) {
      var _originalCallbackFn = callback;
      callback = {
        success: function() {
          // Shift arguments over (prepend a `null` first argument)
          // so this will never be perceived as an `err` when it's
          // used as a traditional callback
          var args = Array.prototype.slice.call(arguments);
          args.unshift(null);
          _originalCallbackFn.apply(callbackContext || this, args);
        },
        error: function() {
          // Ensure a first arg exists (err)
          // (if not, prepend an anonymous Error)
          var args = Array.prototype.slice.call(arguments);
          if (!args[0]) {
            args[0] = new Error();
          }
          _originalCallbackFn.apply(callbackContext || this, args);
        }
      };
      callback = callback || {};
    }
    return callback;
  }
};

},{"lodash":90,"util":131}],97:[function(_dereq_,module,exports){

},{}],98:[function(_dereq_,module,exports){
module.exports=_dereq_(97)
},{}],99:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */
var path = _dereq_('path');
var packpath = _dereq_('packpath');



/**
 * Uses `packpath` (https://github.com/jprichardson/node-packpath)
 * to generate a more convenient require method.
 * 
 * @type {Function}
 */
function requireFromModuleRoot ( relativePathFromModuleRoot ) {
	return _dereq_(path.join(packpath.parent(),relativePathFromModuleRoot));
}

/**
 * Provide access to packpath directly
 * @type {Object}
 */
requireFromModuleRoot.packpath = packpath;

module.exports = requireFromModuleRoot;
},{"packpath":100,"path":129}],100:[function(_dereq_,module,exports){
var fs = _dereq_('fs')
  , path = _dereq_('path')
  , selfModule = module.parent;

if (typeof fs.existsSync === 'undefined')
  fs.existsSync = path.existsSync; //make Node v0.4 -> v0.8 compatible


function packageFind(paths) {
  if (!paths) return null;
    
  for (var i = 0; i < paths.length; ++i){
    var dir = path.dirname(paths[i]);
    if (fs.existsSync(path.join(dir, 'package.json')))
      return dir;
  }
    
  return null;
}

module.exports.self = function() {
  if (selfModule)
    return packageFind(selfModule.paths);
  else
    return null;
}

module.exports.parent = function() {
  if (selfModule.parent)
    return packageFind(selfModule.parent.paths);
  else
    return null
}


},{"fs":122,"path":129}],101:[function(_dereq_,module,exports){
;(function(exports) {

// export the class if we are in a Node-like system.
if (typeof module === 'object' && module.exports === exports)
  exports = module.exports = SemVer;

// The debug function is excluded entirely from the minified version.

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
exports.SEMVER_SPEC_VERSION = '2.0.0';

// The actual regexps go on exports.re
var re = exports.re = [];
var src = exports.src = [];
var R = 0;

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

var NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = '0|[1-9]\\d*';
var NUMERICIDENTIFIERLOOSE = R++;
src[NUMERICIDENTIFIERLOOSE] = '[0-9]+';


// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

var NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';


// ## Main Version
// Three dot-separated numeric identifiers.

var MAINVERSION = R++;
src[MAINVERSION] = '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')';

var MAINVERSIONLOOSE = R++;
src[MAINVERSIONLOOSE] = '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')';

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

var PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = '(?:' + src[NUMERICIDENTIFIER] +
                            '|' + src[NONNUMERICIDENTIFIER] + ')';

var PRERELEASEIDENTIFIERLOOSE = R++;
src[PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[NUMERICIDENTIFIERLOOSE] +
                                 '|' + src[NONNUMERICIDENTIFIER] + ')';


// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

var PRERELEASE = R++;
src[PRERELEASE] = '(?:-(' + src[PRERELEASEIDENTIFIER] +
                  '(?:\\.' + src[PRERELEASEIDENTIFIER] + ')*))';

var PRERELEASELOOSE = R++;
src[PRERELEASELOOSE] = '(?:-?(' + src[PRERELEASEIDENTIFIERLOOSE] +
                       '(?:\\.' + src[PRERELEASEIDENTIFIERLOOSE] + ')*))';

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

var BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = '[0-9A-Za-z-]+';

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

var BUILD = R++;
src[BUILD] = '(?:\\+(' + src[BUILDIDENTIFIER] +
             '(?:\\.' + src[BUILDIDENTIFIER] + ')*))';


// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

var FULL = R++;
var FULLPLAIN = 'v?' + src[MAINVERSION] +
                src[PRERELEASE] + '?' +
                src[BUILD] + '?';

src[FULL] = '^' + FULLPLAIN + '$';

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
var LOOSEPLAIN = '[v=\\s]*' + src[MAINVERSIONLOOSE] +
                 src[PRERELEASELOOSE] + '?' +
                 src[BUILD] + '?';

var LOOSE = R++;
src[LOOSE] = '^' + LOOSEPLAIN + '$';

var GTLT = R++;
src[GTLT] = '((?:<|>)?=?)';

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
var XRANGEIDENTIFIERLOOSE = R++;
src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
var XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + '|x|X|\\*';

var XRANGEPLAIN = R++;
src[XRANGEPLAIN] = '[v=\\s]*(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:(' + src[PRERELEASE] + ')' +
                   ')?)?)?';

var XRANGEPLAINLOOSE = R++;
src[XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:(' + src[PRERELEASELOOSE] + ')' +
                        ')?)?)?';

// >=2.x, for example, means >=2.0.0-0
// <1.x would be the same as "<1.0.0-0", though.
var XRANGE = R++;
src[XRANGE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAIN] + '$';
var XRANGELOOSE = R++;
src[XRANGELOOSE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAINLOOSE] + '$';

// Tilde ranges.
// Meaning is "reasonably at or greater than"
var LONETILDE = R++;
src[LONETILDE] = '(?:~>?)';

var TILDETRIM = R++;
src[TILDETRIM] = '(\\s*)' + src[LONETILDE] + '\\s+';
re[TILDETRIM] = new RegExp(src[TILDETRIM], 'g');
var tildeTrimReplace = '$1~';

var TILDE = R++;
src[TILDE] = '^' + src[LONETILDE] + src[XRANGEPLAIN] + '$';
var TILDELOOSE = R++;
src[TILDELOOSE] = '^' + src[LONETILDE] + src[XRANGEPLAINLOOSE] + '$';

// Caret ranges.
// Meaning is "at least and backwards compatible with"
var LONECARET = R++;
src[LONECARET] = '(?:\\^)';

var CARETTRIM = R++;
src[CARETTRIM] = '(\\s*)' + src[LONECARET] + '\\s+';
re[CARETTRIM] = new RegExp(src[CARETTRIM], 'g');
var caretTrimReplace = '$1^';

var CARET = R++;
src[CARET] = '^' + src[LONECARET] + src[XRANGEPLAIN] + '$';
var CARETLOOSE = R++;
src[CARETLOOSE] = '^' + src[LONECARET] + src[XRANGEPLAINLOOSE] + '$';

// A simple gt/lt/eq thing, or just "" to indicate "any version"
var COMPARATORLOOSE = R++;
src[COMPARATORLOOSE] = '^' + src[GTLT] + '\\s*(' + LOOSEPLAIN + ')$|^$';
var COMPARATOR = R++;
src[COMPARATOR] = '^' + src[GTLT] + '\\s*(' + FULLPLAIN + ')$|^$';


// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
var COMPARATORTRIM = R++;
src[COMPARATORTRIM] = '(\\s*)' + src[GTLT] +
                      '\\s*(' + LOOSEPLAIN + '|' + src[XRANGEPLAIN] + ')';

// this one has to use the /g flag
re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], 'g');
var comparatorTrimReplace = '$1$2$3';


// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
var HYPHENRANGE = R++;
src[HYPHENRANGE] = '^\\s*(' + src[XRANGEPLAIN] + ')' +
                   '\\s+-\\s+' +
                   '(' + src[XRANGEPLAIN] + ')' +
                   '\\s*$';

var HYPHENRANGELOOSE = R++;
src[HYPHENRANGELOOSE] = '^\\s*(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s+-\\s+' +
                        '(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s*$';

// Star ranges basically just allow anything at all.
var STAR = R++;
src[STAR] = '(<|>)?=?\\s*\\*';

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (var i = 0; i < R; i++) {
  ;
  if (!re[i])
    re[i] = new RegExp(src[i]);
}

exports.parse = parse;
function parse(version, loose) {
  var r = loose ? re[LOOSE] : re[FULL];
  return (r.test(version)) ? new SemVer(version, loose) : null;
}

exports.valid = valid;
function valid(version, loose) {
  var v = parse(version, loose);
  return v ? v.version : null;
}


exports.clean = clean;
function clean(version, loose) {
  var s = parse(version, loose);
  return s ? s.version : null;
}

exports.SemVer = SemVer;

function SemVer(version, loose) {
  if (version instanceof SemVer) {
    if (version.loose === loose)
      return version;
    else
      version = version.version;
  } else if (typeof version !== 'string') {
    throw new TypeError('Invalid Version: ' + version);
  }

  if (!(this instanceof SemVer))
    return new SemVer(version, loose);

  ;
  this.loose = loose;
  var m = version.trim().match(loose ? re[LOOSE] : re[FULL]);

  if (!m)
    throw new TypeError('Invalid Version: ' + version);

  this.raw = version;

  // these are actually numbers
  this.major = +m[1];
  this.minor = +m[2];
  this.patch = +m[3];

  // numberify any prerelease numeric ids
  if (!m[4])
    this.prerelease = [];
  else
    this.prerelease = m[4].split('.').map(function(id) {
      return (/^[0-9]+$/.test(id)) ? +id : id;
    });

  this.build = m[5] ? m[5].split('.') : [];
  this.format();
}

SemVer.prototype.format = function() {
  this.version = this.major + '.' + this.minor + '.' + this.patch;
  if (this.prerelease.length)
    this.version += '-' + this.prerelease.join('.');
  return this.version;
};

SemVer.prototype.inspect = function() {
  return '<SemVer "' + this + '">';
};

SemVer.prototype.toString = function() {
  return this.version;
};

SemVer.prototype.compare = function(other) {
  ;
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return this.compareMain(other) || this.comparePre(other);
};

SemVer.prototype.compareMain = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return compareIdentifiers(this.major, other.major) ||
         compareIdentifiers(this.minor, other.minor) ||
         compareIdentifiers(this.patch, other.patch);
};

SemVer.prototype.comparePre = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  // NOT having a prerelease is > having one
  if (this.prerelease.length && !other.prerelease.length)
    return -1;
  else if (!this.prerelease.length && other.prerelease.length)
    return 1;
  else if (!this.prerelease.length && !other.prerelease.length)
    return 0;

  var i = 0;
  do {
    var a = this.prerelease[i];
    var b = other.prerelease[i];
    ;
    if (a === undefined && b === undefined)
      return 0;
    else if (b === undefined)
      return 1;
    else if (a === undefined)
      return -1;
    else if (a === b)
      continue;
    else
      return compareIdentifiers(a, b);
  } while (++i);
};

// preminor will bump the version up to the next minor release, and immediately
// down to pre-release. premajor and prepatch work the same way.
SemVer.prototype.inc = function(release) {
  switch (release) {
    case 'premajor':
      this.inc('major');
      this.inc('pre');
      break;
    case 'preminor':
      this.inc('minor');
      this.inc('pre');
      break;
    case 'prepatch':
      this.inc('patch');
      this.inc('pre');
      break;
    // If the input is a non-prerelease version, this acts the same as
    // prepatch.
    case 'prerelease':
      if (this.prerelease.length === 0)
        this.inc('patch');
      this.inc('pre');
      break;
    case 'major':
      this.major++;
      this.minor = -1;
    case 'minor':
      this.minor++;
      this.patch = 0;
      this.prerelease = [];
      break;
    case 'patch':
      // If this is not a pre-release version, it will increment the patch.
      // If it is a pre-release it will bump up to the same patch version.
      // 1.2.0-5 patches to 1.2.0
      // 1.2.0 patches to 1.2.1
      if (this.prerelease.length === 0)
        this.patch++;
      this.prerelease = [];
      break;
    // This probably shouldn't be used publically.
    // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
    case 'pre':
      if (this.prerelease.length === 0)
        this.prerelease = [0];
      else {
        var i = this.prerelease.length;
        while (--i >= 0) {
          if (typeof this.prerelease[i] === 'number') {
            this.prerelease[i]++;
            i = -2;
          }
        }
        if (i === -1) // didn't increment anything
          this.prerelease.push(0);
      }
      break;

    default:
      throw new Error('invalid increment argument: ' + release);
  }
  this.format();
  return this;
};

exports.inc = inc;
function inc(version, release, loose) {
  try {
    return new SemVer(version, loose).inc(release).version;
  } catch (er) {
    return null;
  }
}

exports.compareIdentifiers = compareIdentifiers;

var numeric = /^[0-9]+$/;
function compareIdentifiers(a, b) {
  var anum = numeric.test(a);
  var bnum = numeric.test(b);

  if (anum && bnum) {
    a = +a;
    b = +b;
  }

  return (anum && !bnum) ? -1 :
         (bnum && !anum) ? 1 :
         a < b ? -1 :
         a > b ? 1 :
         0;
}

exports.rcompareIdentifiers = rcompareIdentifiers;
function rcompareIdentifiers(a, b) {
  return compareIdentifiers(b, a);
}

exports.compare = compare;
function compare(a, b, loose) {
  return new SemVer(a, loose).compare(b);
}

exports.compareLoose = compareLoose;
function compareLoose(a, b) {
  return compare(a, b, true);
}

exports.rcompare = rcompare;
function rcompare(a, b, loose) {
  return compare(b, a, loose);
}

exports.sort = sort;
function sort(list, loose) {
  return list.sort(function(a, b) {
    return exports.compare(a, b, loose);
  });
}

exports.rsort = rsort;
function rsort(list, loose) {
  return list.sort(function(a, b) {
    return exports.rcompare(a, b, loose);
  });
}

exports.gt = gt;
function gt(a, b, loose) {
  return compare(a, b, loose) > 0;
}

exports.lt = lt;
function lt(a, b, loose) {
  return compare(a, b, loose) < 0;
}

exports.eq = eq;
function eq(a, b, loose) {
  return compare(a, b, loose) === 0;
}

exports.neq = neq;
function neq(a, b, loose) {
  return compare(a, b, loose) !== 0;
}

exports.gte = gte;
function gte(a, b, loose) {
  return compare(a, b, loose) >= 0;
}

exports.lte = lte;
function lte(a, b, loose) {
  return compare(a, b, loose) <= 0;
}

exports.cmp = cmp;
function cmp(a, op, b, loose) {
  var ret;
  switch (op) {
    case '===': ret = a === b; break;
    case '!==': ret = a !== b; break;
    case '': case '=': case '==': ret = eq(a, b, loose); break;
    case '!=': ret = neq(a, b, loose); break;
    case '>': ret = gt(a, b, loose); break;
    case '>=': ret = gte(a, b, loose); break;
    case '<': ret = lt(a, b, loose); break;
    case '<=': ret = lte(a, b, loose); break;
    default: throw new TypeError('Invalid operator: ' + op);
  }
  return ret;
}

exports.Comparator = Comparator;
function Comparator(comp, loose) {
  if (comp instanceof Comparator) {
    if (comp.loose === loose)
      return comp;
    else
      comp = comp.value;
  }

  if (!(this instanceof Comparator))
    return new Comparator(comp, loose);

  ;
  this.loose = loose;
  this.parse(comp);

  if (this.semver === ANY)
    this.value = '';
  else
    this.value = this.operator + this.semver.version;
}

var ANY = {};
Comparator.prototype.parse = function(comp) {
  var r = this.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var m = comp.match(r);

  if (!m)
    throw new TypeError('Invalid comparator: ' + comp);

  this.operator = m[1];
  // if it literally is just '>' or '' then allow anything.
  if (!m[2])
    this.semver = ANY;
  else {
    this.semver = new SemVer(m[2], this.loose);

    // <1.2.3-rc DOES allow 1.2.3-beta (has prerelease)
    // >=1.2.3 DOES NOT allow 1.2.3-beta
    // <=1.2.3 DOES allow 1.2.3-beta
    // However, <1.2.3 does NOT allow 1.2.3-beta,
    // even though `1.2.3-beta < 1.2.3`
    // The assumption is that the 1.2.3 version has something you
    // *don't* want, so we push the prerelease down to the minimum.
    if (this.operator === '<' && !this.semver.prerelease.length) {
      this.semver.prerelease = ['0'];
      this.semver.format();
    }
  }
};

Comparator.prototype.inspect = function() {
  return '<SemVer Comparator "' + this + '">';
};

Comparator.prototype.toString = function() {
  return this.value;
};

Comparator.prototype.test = function(version) {
  ;
  return (this.semver === ANY) ? true :
         cmp(version, this.operator, this.semver, this.loose);
};


exports.Range = Range;
function Range(range, loose) {
  if ((range instanceof Range) && range.loose === loose)
    return range;

  if (!(this instanceof Range))
    return new Range(range, loose);

  this.loose = loose;

  // First, split based on boolean or ||
  this.raw = range;
  this.set = range.split(/\s*\|\|\s*/).map(function(range) {
    return this.parseRange(range.trim());
  }, this).filter(function(c) {
    // throw out any that are not relevant for whatever reason
    return c.length;
  });

  if (!this.set.length) {
    throw new TypeError('Invalid SemVer Range: ' + range);
  }

  this.format();
}

Range.prototype.inspect = function() {
  return '<SemVer Range "' + this.range + '">';
};

Range.prototype.format = function() {
  this.range = this.set.map(function(comps) {
    return comps.join(' ').trim();
  }).join('||').trim();
  return this.range;
};

Range.prototype.toString = function() {
  return this.range;
};

Range.prototype.parseRange = function(range) {
  var loose = this.loose;
  range = range.trim();
  ;
  // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
  var hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
  range = range.replace(hr, hyphenReplace);
  ;
  // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
  range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);
  ;

  // `~ 1.2.3` => `~1.2.3`
  range = range.replace(re[TILDETRIM], tildeTrimReplace);

  // `^ 1.2.3` => `^1.2.3`
  range = range.replace(re[CARETTRIM], caretTrimReplace);

  // normalize spaces
  range = range.split(/\s+/).join(' ');

  // At this point, the range is completely trimmed and
  // ready to be split into comparators.

  var compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var set = range.split(' ').map(function(comp) {
    return parseComparator(comp, loose);
  }).join(' ').split(/\s+/);
  if (this.loose) {
    // in loose mode, throw out any that are not valid comparators
    set = set.filter(function(comp) {
      return !!comp.match(compRe);
    });
  }
  set = set.map(function(comp) {
    return new Comparator(comp, loose);
  });

  return set;
};

// Mostly just for testing and legacy API reasons
exports.toComparators = toComparators;
function toComparators(range, loose) {
  return new Range(range, loose).set.map(function(comp) {
    return comp.map(function(c) {
      return c.value;
    }).join(' ').trim().split(' ');
  });
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator(comp, loose) {
  ;
  comp = replaceCarets(comp, loose);
  ;
  comp = replaceTildes(comp, loose);
  ;
  comp = replaceXRanges(comp, loose);
  ;
  comp = replaceStars(comp, loose);
  ;
  return comp;
}

function isX(id) {
  return !id || id.toLowerCase() === 'x' || id === '*';
}

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceTilde(comp, loose);
  }).join(' ');
}

function replaceTilde(comp, loose) {
  var r = loose ? re[TILDELOOSE] : re[TILDE];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    else if (isX(p))
      // ~1.2 == >=1.2.0- <1.3.0-
      ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
    else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      ret = '>=' + M + '.' + m + '.' + p + pr +
            ' <' + M + '.' + (+m + 1) + '.0-0';
    } else
      // ~1.2.3 == >=1.2.3-0 <1.3.0-0
      ret = '>=' + M + '.' + m + '.' + p + '-0' +
            ' <' + M + '.' + (+m + 1) + '.0-0';

    ;
    return ret;
  });
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceCaret(comp, loose);
  }).join(' ');
}

function replaceCaret(comp, loose) {
  var r = loose ? re[CARETLOOSE] : re[CARET];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    else if (isX(p)) {
      if (M === '0')
        ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
      else
        ret = '>=' + M + '.' + m + '.0-0 <' + (+M + 1) + '.0.0-0';
    } else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      if (M === '0') {
        if (m === '0')
          ret = '=' + M + '.' + m + '.' + p + pr;
        else
          ret = '>=' + M + '.' + m + '.' + p + pr +
                ' <' + M + '.' + (+m + 1) + '.0-0';
      } else
        ret = '>=' + M + '.' + m + '.' + p + pr +
              ' <' + (+M + 1) + '.0.0-0';
    } else {
      if (M === '0') {
        if (m === '0')
          ret = '=' + M + '.' + m + '.' + p;
        else
          ret = '>=' + M + '.' + m + '.' + p + '-0' +
                ' <' + M + '.' + (+m + 1) + '.0-0';
      } else
        ret = '>=' + M + '.' + m + '.' + p + '-0' +
              ' <' + (+M + 1) + '.0.0-0';
    }

    ;
    return ret;
  });
}

function replaceXRanges(comp, loose) {
  ;
  return comp.split(/\s+/).map(function(comp) {
    return replaceXRange(comp, loose);
  }).join(' ');
}

function replaceXRange(comp, loose) {
  comp = comp.trim();
  var r = loose ? re[XRANGELOOSE] : re[XRANGE];
  return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
    ;
    var xM = isX(M);
    var xm = xM || isX(m);
    var xp = xm || isX(p);
    var anyX = xp;

    if (gtlt === '=' && anyX)
      gtlt = '';

    if (gtlt && anyX) {
      // replace X with 0, and then append the -0 min-prerelease
      if (xM)
        M = 0;
      if (xm)
        m = 0;
      if (xp)
        p = 0;

      if (gtlt === '>') {
        // >1 => >=2.0.0-0
        // >1.2 => >=1.3.0-0
        // >1.2.3 => >= 1.2.4-0
        gtlt = '>=';
        if (xM) {
          // no change
        } else if (xm) {
          M = +M + 1;
          m = 0;
          p = 0;
        } else if (xp) {
          m = +m + 1;
          p = 0;
        }
      }


      ret = gtlt + M + '.' + m + '.' + p + '-0';
    } else if (xM) {
      // allow any
      ret = '*';
    } else if (xm) {
      // append '-0' onto the version, otherwise
      // '1.x.x' matches '2.0.0-beta', since the tag
      // *lowers* the version value
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    } else if (xp) {
      ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
    }

    ;

    return ret;
  });
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars(comp, loose) {
  ;
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re[STAR], '');
}

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0-0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0-0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0-0 <3.5.0-0
function hyphenReplace($0,
                       from, fM, fm, fp, fpr, fb,
                       to, tM, tm, tp, tpr, tb) {

  if (isX(fM))
    from = '';
  else if (isX(fm))
    from = '>=' + fM + '.0.0-0';
  else if (isX(fp))
    from = '>=' + fM + '.' + fm + '.0-0';
  else
    from = '>=' + from;

  if (isX(tM))
    to = '';
  else if (isX(tm))
    to = '<' + (+tM + 1) + '.0.0-0';
  else if (isX(tp))
    to = '<' + tM + '.' + (+tm + 1) + '.0-0';
  else if (tpr)
    to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
  else
    to = '<=' + to;

  return (from + ' ' + to).trim();
}


// if ANY of the sets match ALL of its comparators, then pass
Range.prototype.test = function(version) {
  if (!version)
    return false;
  for (var i = 0; i < this.set.length; i++) {
    if (testSet(this.set[i], version))
      return true;
  }
  return false;
};

function testSet(set, version) {
  for (var i = 0; i < set.length; i++) {
    if (!set[i].test(version))
      return false;
  }
  return true;
}

exports.satisfies = satisfies;
function satisfies(version, range, loose) {
  try {
    range = new Range(range, loose);
  } catch (er) {
    return false;
  }
  return range.test(version);
}

exports.maxSatisfying = maxSatisfying;
function maxSatisfying(versions, range, loose) {
  return versions.filter(function(version) {
    return satisfies(version, range, loose);
  }).sort(function(a, b) {
    return rcompare(a, b, loose);
  })[0] || null;
}

exports.validRange = validRange;
function validRange(range, loose) {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, loose).range || '*';
  } catch (er) {
    return null;
  }
}

// Determine if version is less than all the versions possible in the range
exports.ltr = ltr;
function ltr(version, range, loose) {
  return outside(version, range, '<', loose);
}

// Determine if version is greater than all the versions possible in the range.
exports.gtr = gtr;
function gtr(version, range, loose) {
  return outside(version, range, '>', loose);
}

exports.outside = outside;
function outside(version, range, hilo, loose) {
  version = new SemVer(version, loose);
  range = new Range(range, loose);

  var gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case '>':
      gtfn = gt;
      ltefn = lte;
      ltfn = lt;
      comp = '>';
      ecomp = '>=';
      break;
    case '<':
      gtfn = lt;
      ltefn = gte;
      ltfn = gt;
      comp = '<';
      ecomp = '<=';
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }

  // If it satisifes the range it is not outside
  if (satisfies(version, range, loose)) {
    return false;
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i];

    var high = null;
    var low = null;

    comparators.forEach(function(comparator) {
      high = high || comparator;
      low = low || comparator;
      if (gtfn(comparator.semver, high.semver, loose)) {
        high = comparator;
      } else if (ltfn(comparator.semver, low.semver, loose)) {
        low = comparator;
      }
    });

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
}

// Use the define() function if we're in AMD land
if (typeof define === 'function' && define.amd)
  define(exports);

})(
  typeof exports === 'object' ? exports :
  typeof define === 'function' && define.amd ? {} :
  semver = {}
);

},{}],102:[function(_dereq_,module,exports){
module.exports = _dereq_('./lib');
},{"./lib":107}],103:[function(_dereq_,module,exports){
// See http://stackoverflow.com/a/3143231/486547
module.exports = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

},{}],104:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash')
  , util = _dereq_('util');


/**
 * Apply a `limit` modifier to `data` using `limit`.
 *
 * @param  { Object[] }  data
 * @param  { Integer }    limit
 * @return { Object[] }
 */
module.exports = function (data, limit) {
  if( limit === undefined || !data ) return data;
  if( limit === 0 ) return null;
  return _.first(data, limit);
};

},{"lodash":114,"util":131}],105:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash')
  , util = _dereq_('util');


/**
 * Apply a `skip` modifier to `data` using `numToSkip`.
 * 
 * @param  { Object[] }  data
 * @param  { Integer }   numToSkip
 * @return { Object[] }
 */
module.exports = function (data, numToSkip) {

  if(!numToSkip || !data) return data;
  
  // Ignore the first `numToSkip` tuples
  return _.rest(data, numToSkip);
};

},{"lodash":114,"util":131}],106:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var X_ISO_DATE = _dereq_('../X_ISO_DATE.constant');



/**
 * Apply a(nother) `where` filter to `data`
 *
 * @param  { Object[] }  data
 * @param  { Object }    where
 * @return { Object[] }
 */
module.exports = function (data, where) {
  if( !data ) return data;
  return _.filter(data, function(tuple) {
    return matchSet(tuple, where);
  });
};






//////////////////////////
///
/// private methods   ||
///                   \/
///
//////////////////////////


// Match a model against each criterion in a criteria query
function matchSet(model, criteria, parentKey) {

  // Null or {} WHERE query always matches everything
  if(!criteria || _.isEqual(criteria, {})) return true;

  // By default, treat entries as AND
  return _.all(criteria, function(criterion, key) {
    return matchItem(model, key, criterion, parentKey);
  });
}


function matchOr(model, disjuncts) {
  var outcomes = [];
  _.each(disjuncts, function(criteria) {
    if(matchSet(model, criteria)) outcomes.push(true);
  });

  var outcome = outcomes.length > 0 ? true : false;
  return outcome;
}

function matchAnd(model, conjuncts) {
  var outcome = true;
  _.each(conjuncts, function(criteria) {
    if(!matchSet(model, criteria)) outcome = false;
  });
  return outcome;
}

function matchLike(model, criteria) {
  for(var key in criteria) {
    // Return false if no match is found
    if (!checkLike(model[key], criteria[key])) return false;
  }
  return true;
}

function matchNot(model, criteria) {
  return !matchSet(model, criteria);
}

function matchItem(model, key, criterion, parentKey) {

  // Handle special attr query
  if (parentKey) {

    if (key === 'equals' || key === '=' || key === 'equal') {
      return matchLiteral(model,parentKey,criterion, compare['=']);
    }
    else if (key === 'not' || key === '!') {

      // Check for Not In
      if(Array.isArray(criterion)) {

        var match = false;
        criterion.forEach(function(val) {
          if(compare['='](model[parentKey], val)) {
            match = true;
          }
        });

        return match ? false : true;
      }

      return matchLiteral(model,parentKey,criterion, compare['!']);
    }
    else if (key === 'greaterThan' || key === '>') {
      return matchLiteral(model,parentKey,criterion, compare['>']);
    }
    else if (key === 'greaterThanOrEqual' || key === '>=')  {
      return matchLiteral(model,parentKey,criterion, compare['>=']);
    }
    else if (key === 'lessThan' || key === '<')  {
      return matchLiteral(model,parentKey,criterion, compare['<']);
    }
    else if (key === 'lessThanOrEqual' || key === '<=')  {
      return matchLiteral(model,parentKey,criterion, compare['<=']);
    }
    else if (key === 'startsWith') return matchLiteral(model,parentKey,criterion, checkStartsWith);
    else if (key === 'endsWith') return matchLiteral(model,parentKey,criterion, checkEndsWith);
    else if (key === 'contains') return matchLiteral(model,parentKey,criterion, checkContains);
    else if (key === 'like') return matchLiteral(model,parentKey,criterion, checkLike);
    else throw new Error ('Invalid query syntax!');
  }
  else if(key.toLowerCase() === 'or') {
    return matchOr(model, criterion);
  } else if(key.toLowerCase() === 'not') {
    return matchNot(model, criterion);
  } else if(key.toLowerCase() === 'and') {
    return matchAnd(model, criterion);
  } else if(key.toLowerCase() === 'like') {
    return matchLike(model, criterion);
  }
  // IN query
  else if(_.isArray(criterion)) {
    return _.any(criterion, function(val) {
      return compare['='](model[key], val);
    });
  }

  // Special attr query
  else if (_.isObject(criterion) && validSubAttrCriteria(criterion)) {
    // Attribute is being checked in a specific way
    return matchSet(model, criterion, key);
  }

  // Otherwise, try a literal match
  else return matchLiteral(model,key,criterion, compare['=']);

}

// Comparison fns
var compare = {

  // Equalish
  '=' : function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] == x[1];
  },

  // Not equalish
  '!' : function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] != x[1];
  },
  '>' : function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] > x[1];
  },
  '>=': function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] >= x[1];
  },
  '<' : function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] < x[1];
  },
  '<=': function (a,b) {
    var x = normalizeComparison(a,b);
    return x[0] <= x[1];
  }
};

// Prepare two values for comparison
function normalizeComparison(a,b) {

  if(_.isUndefined(a) || a === null) a = '';
  if(_.isUndefined(b) || b === null) b = '';

  if (_.isString(a) && _.isString(b)) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  // If Comparing dates, keep them as dates
  if(_.isDate(a) && _.isDate(b)) {
    return [a,b];
  }
  // Otherwise convert them to ISO strings
  if (_.isDate(a)) { a = a.toISOString(); }
  if (_.isDate(b)) { b = b.toISOString(); }


  // Stringify for comparisons- except for numbers, null, and undefined
  if (!_.isNumber(a)) {
    a = typeof a.toString !== 'undefined' ? a.toString() : '' + a;
  }
  if (!_.isNumber(b)) {
    b = typeof b.toString !== 'undefined' ? b.toString() : '' + b;
  }

  // If comparing date-like things, treat them like dates
  if (_.isString(a) && _.isString(b) && a.match(X_ISO_DATE) && b.match(X_ISO_DATE)) {
    return ([new Date(a), new Date(b)]);
  }

  return [a,b];
}

// Return whether this criteria is valid as an object inside of an attribute
function validSubAttrCriteria(c) {

  if(!_.isObject(c)) return false;

  var valid = false;
  var validAttributes = ['not', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual',
    '<', '<=', '!', '>', '>=', 'startsWith', 'endsWith', 'contains', 'like'];

  _.each(validAttributes, function(attr) {
    if(hasOwnProperty(c, attr)) valid = true;
  });

  return valid;
}

// Returns whether this value can be successfully parsed as a finite number
function isNumbery (value) {
  if(_.isDate(value)) return false;
  return Math.pow(+value, 2) > 0;
}

// matchFn => the function that will be run to check for a match between the two literals
function matchLiteral(model, key, criterion, matchFn) {

  var val = _.cloneDeep(model[key]);

  // If the criterion are both parsable finite numbers, cast them
  if(isNumbery(criterion) && isNumbery(val)) {
    criterion = +criterion;
    val = +val;
  }

  // ensure the key attr exists in model
  if(!model.hasOwnProperty(key)) return false;
  if(_.isUndefined(criterion)) return false;

  // ensure the key attr matches model attr in model
  if((!matchFn(val,criterion))) {
    return false;
  }

  // Otherwise this is a match
  return true;
}


function checkStartsWith (value, matchString) {
  // console.log('CheCKING startsWith ', value, 'against matchString:', matchString, 'result:',sqlLikeMatch(value, matchString));
  return sqlLikeMatch(value, matchString + '%');
}
function checkEndsWith (value, matchString) {
  return sqlLikeMatch(value, '%' + matchString);
}
function checkContains (value, matchString) {
  return sqlLikeMatch(value, '%' + matchString + '%');
}
function checkLike (value, matchString) {
  // console.log('CheCKING  ', value, 'against matchString:', matchString, 'result:',sqlLikeMatch(value, matchString));
  return sqlLikeMatch(value, matchString);
}

function sqlLikeMatch (value,matchString) {

  if(_.isRegExp(matchString)) {
    // awesome
  } else if(_.isString(matchString)) {
    // Handle escaped percent (%) signs
    matchString = matchString.replace(/%%%/g, '%');

    // Escape regex
    matchString = escapeRegExp(matchString);

    // Replace SQL % match notation with something the ECMA regex parser can handle
    matchString = matchString.replace(/([^%]*)%([^%]*)/g, '$1.*$2');

    // Case insensitive by default
    // TODO: make this overridable
    var modifiers = 'i';

    matchString = new RegExp('^' + matchString + '$', modifiers);
  }
  // Unexpected match string!
  else {
    console.error('matchString:');
    console.error(matchString);
    throw new Error('Unexpected match string: ' + matchString + ' Please use a regexp or string.');
  }

  // Deal with non-strings
  if(_.isNumber(value)) value = '' + value;
  else if(_.isBoolean(value)) value = value ? 'true' : 'false';
  else if(!_.isString(value)) {
    // Ignore objects, arrays, null, and undefined data for now
    // (and maybe forever)
    return false;
  }

  // Check that criterion attribute and is at least similar to the model's value for that attr
  if(!value.match(matchString)) {
    return false;
  }
  return true;
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}



/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */

var hop = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, prop) {
  return hop.call(obj, prop);
}

},{"../X_ISO_DATE.constant":103,"lodash":114}],107:[function(_dereq_,module,exports){
(function (__dirname){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var util = _dereq_('util');
var path = _dereq_('path');


module.exports = _.extend(

  // Provide all-in-one top-level function
  _dereq_('./query'),

  // but also expose direct access
  // to all filters and projections.
  {
    where: _dereq_('./filters/where'),
    limit: _dereq_('./filters/limit'),
    skip: _dereq_('./filters/skip'),
    sort: _dereq_('./sort'),

    // Projections and aggregations are not-yet-officially supported:
    groupBy: _dereq_('./projections/groupBy'),
    select: _dereq_('./projections/select')

    // Joins are currently supported by Waterline core:
    // , populate : require('./projections/populate')
    // , leftJoin : require('./projections/leftJoin')
    // , join     : require('./projections/join')
    // , rightJoin : require('./projections/rightJoin')

  });



/**
 * Load CommonJS submodules from the specified
 * relative path.
 *
 * @return {Object}
 */
function loadSubModules(relPath) {
  return _dereq_('include-all')({
    dirname: path.resolve(__dirname, relPath),
    filter: /(.+)\.js$/
  });
}

}).call(this,"/node_modules/waterline-criteria/lib")
},{"./filters/limit":104,"./filters/skip":105,"./filters/where":106,"./projections/groupBy":108,"./projections/select":109,"./query":110,"./sort":111,"include-all":112,"lodash":114,"path":129,"util":131}],108:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash')
  , util = _dereq_('util');


/**
 * Partition the tuples in `filteredData` into buckets via `groupByAttribute`.
 * Works with aggregations to allow for powerful reporting queries.
 * 
 * @param  { Object[] }  filteredData
 * @param  { String }    groupByAttribute
 * @return { Object[] }
 */
module.exports = function (filteredData, groupByAttribute) {
  return filteredData;
};

},{"lodash":114,"util":131}],109:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var util = _dereq_('util');


/**
 * Project `tuples` on `fields`.
 * 
 * @param  { Object[] }  tuples    [i.e. filteredData]
 * @param  { String[]/Object{} }  fields    [i.e. schema]
 * @return { Object[] }
 */
function select (tuples, fields) {

  // Expand splat shortcut syntax
  if (fields === '*') {
    fields = { '*': true };
  }

  // If `fields` are not an Object or Array, don't modify the output.
  if (typeof fields !== 'object') return tuples;

  // If `fields` are specified as an Array, convert them to an Object.
  if (_.isArray(fields)) {
    fields = _.reduce(fields, function arrayToObj(memo, attrName) {
      memo[attrName] = true;
      return memo;
    }, {});
  }

  // If the '*' key is specified, the projection algorithm is flipped:
  // only keys which are explicitly set to `false` will be excluded--
  // all other keys will be left alone (this lasts until the recursive step.)
  var hasSplat = !!fields['*'];
  var fieldsToExplicitlyOmit = _(fields).where(function _areExplicitlyFalse (v,k){ return v === false; }).keys();
  delete fields['*'];


  // Finally, select fields from tuples.
  return _.map(tuples, function (tuple) {

    // Select the requested attributes of the tuple
    if (hasSplat) {
      tuple = _.omit(tuple, function (value, attrName){
        return _.contains(fieldsToExplicitlyOmit, attrName);
      });
    }
    else {
      tuple = _.pick(tuple, Object.keys(fields));
    }


    // || NOTE THAT THIS APPROACH WILL CHANGE IN AN UPCOMING RELEASE
    // \/ TO MATCH THE CONVENTIONS ESTABLISHED IN WL2.

    // Take recursive step if necessary to support nested
    // SELECT clauses (NOT nested modifiers- more like nested
    // WHEREs)
    // 
    // e.g.:
    // like this:
    //   -> { select: { pet: { collarSize: true } } }
    //   
    // not this:
    //   -> { select: { pet: { select: { collarSize: true } } } }
    //
    _.each(fields, function (subselect, attrName) {

      if (typeof subselect === 'object') {
        if (_.isArray(tuple[attrName])) {
          tuple[attrName] = select(tuple[attrName], subselect);
        }
        else if (_.isObject(tuple[attrName])) {
          tuple[attrName] = select([tuple[attrName]], subselect)[0];
        }
      }
    });

    return tuple;
  });
}

module.exports = select;

},{"lodash":114,"util":131}],110:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var util = _dereq_('util');
var _where = _dereq_('./filters/where');
var _limit = _dereq_('./filters/limit');
var _skip = _dereq_('./filters/skip');
var _select = _dereq_('./projections/select');
var _groupBy = _dereq_('./projections/groupBy');
var _sort = _dereq_('./sort');



/**
 * Filter/aggregate/partition/map the tuples known as `classifier`
 * in `data` using `criteria` (a Waterline criteria object)
 * 
 * @param  { Object[] }           data
 * @param  { Object }             criteria         [the Waterline criteria object- complete w/ `where`, `limit`, `sort, `skip`, and `joins`]
 * 
 * @return { Integer | Object | Object[] }
 */

module.exports = function query ( /* classifier|tuples, data|criteria [, criteria] */ ) {
  
  // Embed an `INDEX_IN_ORIG_DATA` for each tuple to remember its original index
  // within `data`.  At the end, we'll lookup the `INDEX_IN_ORIG_DATA` for each tuple
  // and expose it as part of our results.
  var INDEX_IN_ORIG_DATA = '.(ørigindex)';

  var tuples, classifier, data, criteria;

  // If no classifier is provided, and data was specified as an array
  // instead of an object, infer tuples from the array
  if (_.isArray(arguments[0]) && !arguments[2]) {
    tuples = arguments[0];
    criteria = arguments[1];
  }
  // If all three arguments were supplied:
  // get tuples of type `classifier` (i.e. SELECT * FROM __________)
  // and clone 'em.
  else {
    classifier = arguments[0];
    data = arguments[1];
    criteria = arguments[2];
    tuples = data[classifier];
  }

  // Clone tuples to avoid dirtying things up
  tuples = _.cloneDeep(tuples);

  // Embed `INDEX_IN_ORIG_DATA` in each tuple
  _.each(tuples, function(tuple, i) {
    tuple[INDEX_IN_ORIG_DATA] = i;
  });

  // Ensure criteria object exists
  criteria = criteria || {};

  // Query and return result set using criteria
  tuples = _where(tuples, criteria.where);
  tuples = _sort(tuples, criteria.sort);
  tuples = _skip(tuples, criteria.skip);
  tuples = _limit(tuples, criteria.limit);
  tuples = _select(tuples, criteria.select);
  
  // TODO:
  // tuples = _groupBy(tuples, criteria.groupBy);

  // Grab the INDEX_IN_ORIG_DATA from each matched tuple
  // this is typically used to update the tuples in the external source data.
  var originalIndices = _.pluck(tuples, INDEX_IN_ORIG_DATA);

  // Remove INDEX_IN_ORIG_DATA from each tuple--
  // it is no longer needed.
  _.each(tuples, function(tuple) {
    delete tuple[INDEX_IN_ORIG_DATA];
  });

  return {
    results: tuples,
    indices: originalIndices
  };
};


},{"./filters/limit":104,"./filters/skip":105,"./filters/where":106,"./projections/groupBy":108,"./projections/select":109,"./sort":111,"lodash":114,"util":131}],111:[function(_dereq_,module,exports){
/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var util = _dereq_('util');
var X_ISO_DATE = _dereq_('./X_ISO_DATE.constant');



/**
 * Sort the tuples in `data` using `comparator`.
 *
 * @param  { Object[] }  data
 * @param  { Object }    comparator
 * @param  { Function }    when
 * @return { Object[] }
 */
module.exports = function(data, comparator, when) {
  if (!comparator || !data) return data;

  // Equivalent to a SQL "WHEN"
  when = when||function rankSpecialCase (record, attrName) {

    // null ranks lower than anything else
    if ( typeof record[attrName]==='undefined' || record[attrName] === null ) {
      return false;
    }
    else return true;
  };

  return sortData(_.cloneDeep(data), comparator, when);
};



//////////////////////////
///
/// private methods   ||
///                   \/
///                   
//////////////////////////






/**
 * Sort `data` (tuples) using `sortVector` (comparator obj)
 *
 * Based on method described here:
 * http://stackoverflow.com/a/4760279/909625
 *
 * @param  { Object[] } data         [tuples]
 * @param  { Object }   sortVector [mongo-style comparator object]
 * @return { Object[] }
 */

function sortData(data, sortVector, when) {

  // Constants
  var GREATER_THAN = 1;
  var LESS_THAN = -1;
  var EQUAL = 0;
  
  return data.sort(function comparator(a, b) {
    return _(sortVector).reduce(function (flagSoFar, sortDirection, attrName){


      var outcome;

      // Handle special cases (defined by WHEN):
      var $a = when(a, attrName);
      var $b = when(b, attrName);
      if (!$a && !$b) outcome = EQUAL;
      else if (!$a && $b) outcome = LESS_THAN;
      else if ($a && !$b) outcome = GREATER_THAN;

      // General case:
      else {
        // Coerce types
        $a = a[attrName];
        $b = b[attrName];
        if ( $a < $b ) outcome = LESS_THAN;
        else if ( $a > $b ) outcome = GREATER_THAN;
        else outcome = EQUAL;
      }

      // Less-Than case (-1)
      // (leaves flagSoFar untouched if it has been set, otherwise sets it)
      if ( outcome === LESS_THAN ) {
        return flagSoFar || -sortDirection;
      }
      // Greater-Than case (1)
      // (leaves flagSoFar untouched if it has been set, otherwise sets it)
      else if ( outcome === GREATER_THAN ) {
        return flagSoFar || sortDirection;
      }
      // Equals case (0)
      // (always leaves flagSoFar untouched)
      else return flagSoFar;

    }, 0);
  });
}






/**
 * Coerce a value to its probable intended type for sorting.
 * 
 * @param  {???} x
 * @return {???}
 */
function coerceIntoBestGuessType (x) {
  switch ( guessType(x) ) {
    case 'booleanish': return (x==='true')?true:false;
    case 'numberish': return +x;
    case 'dateish': return new Date(x);
    default: return x;
  }
}


function guessType (x) {

  if (!_.isString(x)) {
    return typeof x;
  }

  // Probably meant to be a boolean
  else if (x === 'true' || x === 'false') {
    return 'booleanish';
  }

  // Probably meant to be a number
  else if (+x === x) {
    return 'numberish';
  }

  // Probably meant to be a date
  else if (x.match(X_ISO_DATE)) {
    return 'dateish';
  }

  // Just another string
  else return typeof x;
}

},{"./X_ISO_DATE.constant":103,"lodash":114,"util":131}],112:[function(_dereq_,module,exports){
var fs = _dereq_('fs');
var ltrim = _dereq_('underscore.string').ltrim;


// Returns false if the directory doesn't exist
module.exports = function requireAll(options) {
  var files;
  var modules = {};

  if (typeof(options.force) == 'undefined') {
    options.force = true;
  }

  // Sane default for `filter` option
  if (!options.filter) {
    options.filter = /(.*)/;
  }

  // Reset our depth counter the first time
  if (typeof options._depth === 'undefined') {
    options._depth = 0;
  }

  // Bail out if our counter has reached the desired depth
  // indicated by the user in options.depth
  if (typeof options.depth !== 'undefined' &&
    options._depth >= options.depth) {
    return;
  }

  // Remember the starting directory
  if (!options.startDirname) {
    options.startDirname = options.dirname;
  }

  try {
    files = fs.readdirSync(options.dirname);
  } catch (e) {
    if (options.optional) return {};
    else throw new Error('Directory not found: ' + options.dirname);
  }

  // Iterate through files in the current directory
  files.forEach(function(file) {
    var filepath = options.dirname + '/' + file;

    // For directories, continue to recursively include modules
    if (fs.statSync(filepath).isDirectory()) {

      // Ignore explicitly excluded directories
      if (excludeDirectory(file)) return;

      // Recursively call requireAll on each child directory
      modules[file] = requireAll({
        dirname: filepath,
        filter: options.filter,
        pathFilter: options.pathFilter,
        excludeDirs: options.excludeDirs,
        startDirname: options.startDirname,
        dontLoad: options.dontLoad,
        markDirectories: options.markDirectories,
        flattenDirectories: options.flattenDirectories,
        keepDirectoryPath: options.keepDirectoryPath,
        force: options.force,

        // Keep track of depth
        _depth: options._depth+1,
        depth: options.depth
      });

      if (options.markDirectories || options.flattenDirectories) {
        modules[file].isDirectory = true;
      }

      if (options.flattenDirectories) {

        modules = (function flattenDirectories(modules, accum, path) {
          accum = accum || {};
          Object.keys(modules).forEach(function(identity) {
            if (typeof(modules[identity]) !== 'object' && typeof(modules[identity]) !== 'function') {
              return;
            }
            if (modules[identity].isDirectory) {
              flattenDirectories(modules[identity], accum, path ? path + '/' + identity : identity );
            } else {
              accum[options.keepDirectoryPath ? (path ? path + '/' + identity : identity) : identity] = modules[identity];
            }
          });
          return accum;
        })(modules);

      }

    }
    // For files, go ahead and add the code to the module map
    else {

      // Key name for module
      var identity;

      // Filename filter
      if (options.filter) {
        var match = file.match(options.filter);
        if (!match) return;
        identity = match[1];
      }

      // Full relative path filter
      if (options.pathFilter) {
        // Peel off relative path
        var path = filepath.replace(options.startDirname, '');

        // make sure a slash exists on the left side of path
        path = '/' + ltrim(path, '/');

        var pathMatch = path.match(options.pathFilter);
        if (!pathMatch) return;
        identity = pathMatch[2];
      }

      // Load module into memory (unless `dontLoad` is true)
      if (options.dontLoad) {
        modules[identity] = true;
      } else {
        if (options.force) {
          var resolved = _dereq_.resolve(filepath);
          if (_dereq_.cache[resolved]) delete _dereq_.cache[resolved];
        }
        modules[identity] = _dereq_(filepath);
      }
    }
  });

  // Pass map of modules back to app code
  return modules;

  function excludeDirectory(dirname) {
    return options.excludeDirs && dirname.match(options.excludeDirs);
  }
};
},{"fs":122,"underscore.string":113}],113:[function(_dereq_,module,exports){
//  Underscore.string
//  (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
//  Underscore.string is freely distributable under the terms of the MIT license.
//  Documentation: https://github.com/epeli/underscore.string
//  Some code is borrowed from MooTools and Alexandru Marasteanu.
//  Version '2.3.1'

!function(root, String){
  'use strict';

  // Defining helper functions.

  var nativeTrim = String.prototype.trim;
  var nativeTrimRight = String.prototype.trimRight;
  var nativeTrimLeft = String.prototype.trimLeft;

  var parseNumber = function(source) { return source * 1 || 0; };

  var strRepeat = function(str, qty){
    if (qty < 1) return '';
    var result = '';
    while (qty > 0) {
      if (qty & 1) result += str;
      qty >>= 1, str += str;
    }
    return result;
  };

  var slice = [].slice;

  var defaultToWhiteSpace = function(characters) {
    if (characters == null)
      return '\\s';
    else if (characters.source)
      return characters.source;
    else
      return '[' + _s.escapeRegExp(characters) + ']';
  };

  var escapeChars = {
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: "'"
  };

  var reversedEscapeChars = {};
  for(var key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;
  reversedEscapeChars["'"] = '#39';

  // sprintf() for JavaScript 0.7-beta1
  // http://www.diveintojavascript.com/projects/javascript-sprintf
  //
  // Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
  // All rights reserved.

  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    var str_repeat = strRepeat;

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw new Error(sprintf('[_.sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw new Error(sprintf('[_.sprintf] expecting number but found %s', get_type(arg)));
          }
          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw new Error('[_.sprintf] huh?');
                }
              }
            }
            else {
              throw new Error('[_.sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw new Error('[_.sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw new Error('[_.sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();



  // Defining underscore.string

  var _s = {

    VERSION: '2.3.1',

    isBlank: function(str){
      if (str == null) str = '';
      return (/^\s*$/).test(str);
    },

    stripTags: function(str){
      if (str == null) return '';
      return String(str).replace(/<\/?[^>]+>/g, '');
    },

    capitalize : function(str){
      str = str == null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    chop: function(str, step){
      if (str == null) return [];
      str = String(str);
      step = ~~step;
      return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
    },

    clean: function(str){
      return _s.strip(str).replace(/\s+/g, ' ');
    },

    count: function(str, substr){
      if (str == null || substr == null) return 0;

      str = String(str);
      substr = String(substr);

      var count = 0,
        pos = 0,
        length = substr.length;

      while (true) {
        pos = str.indexOf(substr, pos);
        if (pos === -1) break;
        count++;
        pos += length;
      }

      return count;
    },

    chars: function(str) {
      if (str == null) return [];
      return String(str).split('');
    },

    swapCase: function(str) {
      if (str == null) return '';
      return String(str).replace(/\S/g, function(c){
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    },

    escapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function(m){ return '&' + reversedEscapeChars[m] + ';'; });
    },

    unescapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/\&([^;]+);/g, function(entity, entityCode){
        var match;

        if (entityCode in escapeChars) {
          return escapeChars[entityCode];
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
        } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
        } else {
          return entity;
        }
      });
    },

    escapeRegExp: function(str){
      if (str == null) return '';
      return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    },

    splice: function(str, i, howmany, substr){
      var arr = _s.chars(str);
      arr.splice(~~i, ~~howmany, substr);
      return arr.join('');
    },

    insert: function(str, i, substr){
      return _s.splice(str, i, 0, substr);
    },

    include: function(str, needle){
      if (needle === '') return true;
      if (str == null) return false;
      return String(str).indexOf(needle) !== -1;
    },

    join: function() {
      var args = slice.call(arguments),
        separator = args.shift();

      if (separator == null) separator = '';

      return args.join(separator);
    },

    lines: function(str) {
      if (str == null) return [];
      return String(str).split("\n");
    },

    reverse: function(str){
      return _s.chars(str).reverse().join('');
    },

    startsWith: function(str, starts){
      if (starts === '') return true;
      if (str == null || starts == null) return false;
      str = String(str); starts = String(starts);
      return str.length >= starts.length && str.slice(0, starts.length) === starts;
    },

    endsWith: function(str, ends){
      if (ends === '') return true;
      if (str == null || ends == null) return false;
      str = String(str); ends = String(ends);
      return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
    },

    succ: function(str){
      if (str == null) return '';
      str = String(str);
      return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length-1) + 1);
    },

    titleize: function(str){
      if (str == null) return '';
      return String(str).replace(/(?:^|\s)\S/g, function(c){ return c.toUpperCase(); });
    },

    camelize: function(str){
      return _s.trim(str).replace(/[-_\s]+(.)?/g, function(match, c){ return c.toUpperCase(); });
    },

    underscored: function(str){
      return _s.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function(str){
      return _s.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function(str){
      return _s.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
    },

    humanize: function(str){
      return _s.capitalize(_s.underscored(str).replace(/_id$/,'').replace(/_/g, ' '));
    },

    trim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrim) return nativeTrim.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('\^' + characters + '+|' + characters + '+$', 'g'), '');
    },

    ltrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+'), '');
    },

    rtrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp(characters + '+$'), '');
    },

    truncate: function(str, length, truncateStr){
      if (str == null) return '';
      str = String(str); truncateStr = truncateStr || '...';
      length = ~~length;
      return str.length > length ? str.slice(0, length) + truncateStr : str;
    },

    /**
     * _s.prune: a more elegant version of truncate
     * prune extra chars, never leaving a half-chopped word.
     * @author github.com/rwz
     */
    prune: function(str, length, pruneStr){
      if (str == null) return '';

      str = String(str); length = ~~length;
      pruneStr = pruneStr != null ? String(pruneStr) : '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = _s.rtrim(template.slice(0, template.length-1));

      return (template+pruneStr).length > str.length ? str : str.slice(0, template.length)+pruneStr;
    },

    words: function(str, delimiter) {
      if (_s.isBlank(str)) return [];
      return _s.trim(str, delimiter).split(delimiter || /\s+/);
    },

    pad: function(str, length, padStr, type) {
      str = str == null ? '' : String(str);
      length = ~~length;

      var padlen  = 0;

      if (!padStr)
        padStr = ' ';
      else if (padStr.length > 1)
        padStr = padStr.charAt(0);

      switch(type) {
        case 'right':
          padlen = length - str.length;
          return str + strRepeat(padStr, padlen);
        case 'both':
          padlen = length - str.length;
          return strRepeat(padStr, Math.ceil(padlen/2)) + str
                  + strRepeat(padStr, Math.floor(padlen/2));
        default: // 'left'
          padlen = length - str.length;
          return strRepeat(padStr, padlen) + str;
        }
    },

    lpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr);
    },

    rpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'right');
    },

    lrpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'both');
    },

    sprintf: sprintf,

    vsprintf: function(fmt, argv){
      argv.unshift(fmt);
      return sprintf.apply(null, argv);
    },

    toNumber: function(str, decimals) {
      if (!str) return 0;
      str = _s.trim(str);
      if (!str.match(/^-?\d+(?:\.\d+)?$/)) return NaN;
      return parseNumber(parseNumber(str).toFixed(~~decimals));
    },

    numberFormat : function(number, dec, dsep, tsep) {
      if (isNaN(number) || number == null) return '';

      number = number.toFixed(~~dec);
      tsep = typeof tsep == 'string' ? tsep : ',';

      var parts = number.split('.'), fnums = parts[0],
        decimals = parts[1] ? (dsep || '.') + parts[1] : '';

      return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
    },

    strRight: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strRightBack: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.lastIndexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strLeft: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    strLeftBack: function(str, sep){
      if (str == null) return '';
      str += ''; sep = sep != null ? ''+sep : sep;
      var pos = str.lastIndexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    toSentence: function(array, separator, lastSeparator, serial) {
      separator = separator || ', '
      lastSeparator = lastSeparator || ' and '
      var a = array.slice(), lastMember = a.pop();

      if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;

      return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
    },

    toSentenceSerial: function() {
      var args = slice.call(arguments);
      args[3] = true;
      return _s.toSentence.apply(_s, args);
    },

    slugify: function(str) {
      if (str == null) return '';

      var from  = "ąàáäâãåæćęèéëêìíïîłńòóöôõøùúüûñçżź",
          to    = "aaaaaaaaceeeeeiiiilnoooooouuuunczz",
          regex = new RegExp(defaultToWhiteSpace(from), 'g');

      str = String(str).toLowerCase().replace(regex, function(c){
        var index = from.indexOf(c);
        return to.charAt(index) || '-';
      });

      return _s.dasherize(str.replace(/[^\w\s-]/g, ''));
    },

    surround: function(str, wrapper) {
      return [wrapper, str, wrapper].join('');
    },

    quote: function(str) {
      return _s.surround(str, '"');
    },

    exports: function() {
      var result = {};

      for (var prop in this) {
        if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse)$/)) continue;
        result[prop] = this[prop];
      }

      return result;
    },

    repeat: function(str, qty, separator){
      if (str == null) return '';

      qty = ~~qty;

      // using faster implementation if separator is not needed;
      if (separator == null) return strRepeat(String(str), qty);

      // this one is about 300x slower in Google Chrome
      for (var repeat = []; qty > 0; repeat[--qty] = str) {}
      return repeat.join(separator);
    },

    levenshtein: function(str1, str2) {
      if (str1 == null && str2 == null) return 0;
      if (str1 == null) return String(str2).length;
      if (str2 == null) return String(str1).length;

      str1 = String(str1); str2 = String(str2);

      var current = [], prev, value;

      for (var i = 0; i <= str2.length; i++)
        for (var j = 0; j <= str1.length; j++) {
          if (i && j)
            if (str1.charAt(j - 1) === str2.charAt(i - 1))
              value = prev;
            else
              value = Math.min(current[j], current[j - 1], prev) + 1;
          else
            value = i + j;

          prev = current[j];
          current[j] = value;
        }

      return current.pop();
    }
  };

  // Aliases

  _s.strip    = _s.trim;
  _s.lstrip   = _s.ltrim;
  _s.rstrip   = _s.rtrim;
  _s.center   = _s.lrpad;
  _s.rjust    = _s.lpad;
  _s.ljust    = _s.rpad;
  _s.contains = _s.include;
  _s.q        = _s.quote;

  // Exporting

  // CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      module.exports = _s;

    exports._s = _s;
  }

  // Register as a named module with AMD.
  if (typeof define === 'function' && define.amd)
    define('underscore.string', [], function(){ return _s; });


  // Integrate with Underscore.js if defined
  // or create our own underscore object.
  root._ = root._ || {};
  root._.string = root._.str = _s;
}(this, String);

},{}],114:[function(_dereq_,module,exports){
module.exports=_dereq_(90)
},{}],115:[function(_dereq_,module,exports){

/**
 * Module dependencies
 */

var Attributes = _dereq_('./waterline-schema/attributes');
var ForeignKeys = _dereq_('./waterline-schema/foreignKeys');
var JoinTables = _dereq_('./waterline-schema/joinTables');
var References = _dereq_('./waterline-schema/references');

/**
 * Used to build a Waterline Schema object from a set of
 * loaded collections. It should turn the attributes into an
 * object that can be sent down to an adapter and understood.
 *
 * @param {Array} collections
 * @param {Object} connections
 * @return {Object}
 * @api public
 */

module.exports = function(collections, connections, defaults) {

  this.schema = {};

  // Transform Collections into a basic schema
  this.schema = new Attributes(collections, connections, defaults);

  // Build Out Foreign Keys
  this.schema = new ForeignKeys(this.schema);

  // Add Join Tables
  this.schema = new JoinTables(this.schema);

  // Add References for Has Many Keys
  this.schema = new References(this.schema);

  return this.schema;

};

},{"./waterline-schema/attributes":116,"./waterline-schema/foreignKeys":117,"./waterline-schema/joinTables":118,"./waterline-schema/references":119}],116:[function(_dereq_,module,exports){

/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var utils = _dereq_('./utils');
var hop = utils.object.hasOwnProperty;

/**
 * Expose Attributes
 */

module.exports = Attributes;

/**
 * Build an Attributes Definition
 *
 * Takes a collection of attributes from a Waterline Collection
 * and builds up an initial schema by normalizing into a known format.
 *
 * @param {Object} collections
 * @param {Object} connections
 * @return {Object}
 * @api private
 */

function Attributes(collections, connections, defaults) {
  var self = this;

  this.attributes = {};

  // Ensure a value is set for connections
  connections = connections || {};

  for(var key in collections) {
    var collection = this.normalize(collections[key].prototype, connections, defaults);
    var conns = _.cloneDeep(collection.connection);
    var attributes = _.cloneDeep(collection.attributes);

    this.stripFunctions(attributes);
    this.stripProperties(attributes);
    this.validatePropertyNames(attributes);

    this.attributes[collection.identity.toLowerCase()] = {
      connection: conns,
      identity: collection.identity.toLowerCase(),
      tableName: collection.tableName || collection.identity,
      attributes: attributes
    };
  }

  return this.attributes;

}

/**
 * Normalize attributes for a collection into a known format.
 *
 * @param {Object} collection
 * @param {Object} connections
 * @return {Object}
 * @api private
 */

Attributes.prototype.normalize = function(collection, connections, defaults) {

  this.normalizeIdentity(collection);
  this.setDefaults(collection, defaults);
  this.autoAttributes(collection, connections);

  return collection;

};

/**
 * Set Default Values for the collection.
 *
 * Adds flags to the collection to determine if timestamps and a primary key
 * should be added to the collection's schema.
 *
 * @param {Object} collection
 * @api private
 */

Attributes.prototype.setDefaults = function(collection, defaults) {

  // Ensure defaults is always set to something
  defaults = defaults || {};

  if(!hop(collection, 'connection')) {
    collection.connection = '';
  }

  if(!hop(collection, 'attributes')) {
    collection.attributes = {};
  }

  var defaultSettings = {
    autoPK: true,
    autoCreatedAt: true,
    autoUpdatedAt: true
  };

  // Override default settings with user defined defaults
  if(hop(defaults, 'autoPK')) defaultSettings.autoPK = defaults.autoPK;
  if(hop(defaults, 'autoCreatedAt')) defaultSettings.autoCreatedAt = defaults.autoCreatedAt;
  if(hop(defaults, 'autoUpdatedAt')) defaultSettings.autoUpdatedAt = defaults.autoUpdatedAt;

  // Override defaults with collection defined values
  if(hop(collection, 'autoPK')) defaultSettings.autoPK = collection.autoPK;
  if(hop(collection, 'autoCreatedAt')) defaultSettings.autoCreatedAt = collection.autoCreatedAt;
  if(hop(collection, 'autoUpdatedAt')) defaultSettings.autoUpdatedAt = collection.autoUpdatedAt;

  var flags = {
    autoPK: defaultSettings.autoPK,
    autoCreatedAt: defaultSettings.autoCreatedAt,
    autoUpdatedAt: defaultSettings.autoUpdatedAt
  };

  for(var flag in flags) {
    collection[flag] = flags[flag];
  }

};

/**
 * Normalize identity
 *
 * @param {Object} collection
 * @api private
 */

Attributes.prototype.normalizeIdentity = function(collection) {

  if(hop(collection, 'tableName') && !hop(collection, 'identity')) {
    collection.identity = collection.tableName.toLowerCase();
  }

  // Require an identity so the object key can be set
  if(!hop(collection, 'identity')) {
    throw new Error('A Collection must include an identity or tableName attribute');
  }

};

/**
 * Add Auto Attribute definitions to the schema if they are not defined.
 *
 * Adds in things such as an Id primary key and timestamps unless they have been
 * disabled in the collection.
 *
 * @param {Object} collection
 * @param {Object} connections
 * @api private
 */

Attributes.prototype.autoAttributes = function(collection, connections) {

  var attributes = collection.attributes;
  var pk = false;
  var mainConnection;

  // Check to make sure another property hasn't set itself as a primary key
  for(var key in attributes) {
    if(hop(attributes[key], 'primaryKey')) pk = true;
  }

  // If a primary key was manually defined, turn off autoPK
  if(pk) collection.autoPK = false;

  // Add a primary key attribute
  if(!pk && collection.autoPK && !attributes.id) {
    attributes.id = {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true,
      unique: true
    };

    // Check if the adapter used in the collection specifies the primary key format
    if(Array.isArray(collection.connection)) {
      mainConnection = collection.connection[0];
    }
    else {
      mainConnection = collection.connection;
    }

    if(hop(connections, mainConnection)) {
      var connection = connections[mainConnection];
      if(hop(connection._adapter, 'pkFormat')) {
        attributes.id.type = connection._adapter.pkFormat;
      }
    }
  }

  // Extend definition with autoUpdatedAt and autoCreatedAt timestamps
  var now = {
    type: 'datetime',
    'default': 'NOW'
  };

  if(collection.autoCreatedAt && !attributes.createdAt) {
    attributes.createdAt = now;
  }

  if(collection.autoUpdatedAt && !attributes.updatedAt) {
    attributes.updatedAt = now;
  }

};

/**
 * Strip Functions From Schema
 *
 * @param {Object} attributes
 * @api private
 */

Attributes.prototype.stripFunctions = function(attributes) {

  for(var attribute in attributes) {
    if(typeof attributes[attribute] === 'function') delete attributes[attribute];
  }

};

/**
 * Strip Non-Reserved Properties
 *
 * @param {Object} attributes
 * @api private
 */

Attributes.prototype.stripProperties = function(attributes) {

  for(var attribute in attributes) {
    this.stripProperty(attributes[attribute]);
  }

};

/**
 * Strip Property that isn't in the reserved words list.
 *
 * @param {Object}
 * @api private
 */

Attributes.prototype.stripProperty = function(properties) {

  for(var prop in properties) {
    if(utils.reservedWords.indexOf(prop) > -1) continue;
    delete properties[prop];
  }

};

/**
 * Validates property names to ensure they are valid.
 *
 * @param {Object}
 * @api private
 */

Attributes.prototype.validatePropertyNames = function(attributes) {

  for(var attribute in attributes) {

    // Check for dots in name
    if(attribute.match(/\./g)) {
      var error = 'Invalid Attribute Name: Attributes may not contain a "."" character';
      throw new Error(error);
    }

  }

};

},{"./utils":120,"lodash":121}],117:[function(_dereq_,module,exports){

/**
 * Module Dependencies
 */

var _ = _dereq_('lodash');
var utils = _dereq_('./utils');
var hop = utils.object.hasOwnProperty;

/**
 * Expose Foreign Keys
 */

module.exports = ForeignKeys;

/**
 * Adds Foreign keys to a Collection where needed for belongsTo associations.
 *
 * @param {Object} collections
 * @return {Object}
 * @api private
 */

function ForeignKeys(collections) {

  collections = collections || {};
  this.collections = _.clone(collections);

  for(var collection in collections) {
    this.replaceKeys(collections[collection].attributes);
  }

  return collections;

}

/**
 * Replace Model Association with a foreign key attribute
 *
 * @param {Object} attributes
 * @api private
 */

ForeignKeys.prototype.replaceKeys = function(attributes) {

  for(var attribute in attributes) {

    // We only care about adding foreign key values to attributes
    // with a `model` key
    if(!hop(attributes[attribute], 'model')) continue;

    var modelName = attributes[attribute].model.toLowerCase();
    var primaryKey = this.findPrimaryKey(modelName);
    var columnName = this.buildColumnName(attribute, attributes[attribute]);
    var foreignKey = {
      columnName: columnName,
      type: primaryKey.attributes.type,
      foreignKey: true,
      references: modelName,
      on: primaryKey.attributes.columnName || primaryKey.name,
      onKey: primaryKey.name
    };

    // Remove the attribute and replace it with the foreign key
    delete attributes[attribute];
    attributes[attribute] = foreignKey;
  }

};

/**
 * Find a collection's primary key attribute
 *
 * @param {String} collection
 * @return {Object}
 * @api private
 */

ForeignKeys.prototype.findPrimaryKey = function(collection) {

  if(!this.collections[collection]) {
    throw new Error('Trying to access a collection ' + collection + ' that is not defined.');
  }

  if(!this.collections[collection].attributes) {
    throw new Error('Collection, ' + collection + ', has no attributes defined.');
  }

  var primaryKey = null;

  for(var key in this.collections[collection].attributes) {
    var attribute = this.collections[collection].attributes[key];

    if(!hop(attribute, 'primaryKey')) continue;

    primaryKey = {
      name: key,
      attributes: attribute
    };
  }

  if(!primaryKey) {
    var error = 'Trying to create an association on a model that doesn\'t have a Primary Key.';
    throw new Error(error);
  }

  return primaryKey;

};

/**
 * Build A Column Name
 *
 * Uses either the attributes defined columnName or the user defined attribute name
 *
 * @param {String} key
 * @param {Object} attribute
 * @param {Object} primaryKey
 * @return {String}
 * @api private
 */

ForeignKeys.prototype.buildColumnName = function(key, attribute) {

  if(hop(attribute, 'columnName')) return attribute.columnName;
  return key;

};

},{"./utils":120,"lodash":121}],118:[function(_dereq_,module,exports){

/**
 * Module dependencies
 */

var _ = _dereq_('lodash');
var utils = _dereq_('./utils');
var hop = utils.object.hasOwnProperty;

/**
 * Expose JoinTables
 */

module.exports = JoinTables;

/**
 * Insert Join/Junction Tables where needed whenever two collections
 * point to each other. Also replaces the references to point to the new join table.
 *
 * @param {Object} collections
 * @return {Object}
 * @api private
 */

function JoinTables(collections) {

  var self = this;
  var joinTables;

  collections = collections || {};
  this.tables = {};

  this.collections = _.cloneDeep(collections);

  // Build Up Join Tables
  for(var collection in collections) {

    // Parse the collection's attributes and create join tables
    // where needed for collections
    joinTables = this.buildJoins(collection);
    this.uniqueTables(joinTables);

    // Mark hasManyThrough tables as junction tables with select all set to true
    this.markCustomJoinTables(collection);
  }

  // Update Collection Attributes to point to the join table
  this.linkAttributes();

  // Remove properties added just for unqueness
  Object.keys(this.tables).forEach(function(table) {
    delete self.tables[table].joinedAttributes;
  });

  return _.extend(this.collections, this.tables);

}

/**
 * Build A Set of Join Tables
 *
 * @param {String} collection
 * @api private
 * @return {Array}
 */

JoinTables.prototype.buildJoins = function(collection) {

  var self = this;
  var tables = [];

  var attributes = this.collections[collection].attributes;
  var collectionAttributes = this.mapCollections(attributes);

  // If there are no collection attributes return an empty array
  if(Object.keys(collectionAttributes).length === 0) return [];

  // For each collection attribute, inspect it to build up a join table if needed.
  collectionAttributes.forEach(function(attribute) {
    var table = self.parseAttribute(collection, attribute);
    if(table) tables.push(self.buildTable(table));
  });

  return tables;

};

/**
 * Find Has Many attributes for a given set of attributes.
 *
 * @param {Object} attributes
 * @return {Object}
 * @api private
 */

JoinTables.prototype.mapCollections = function(attributes) {

  var collectionAttributes = [];

  for(var attribute in attributes) {
    if(!hop(attributes[attribute], 'collection')) continue;
    collectionAttributes.push({ key: attribute, val: attributes[attribute] });
  }

  return collectionAttributes;

};

/**
 * Parse Collection Attributes
 *
 * Check the collection the attribute references to see if this is a one-to-many or many-to-many
 * relationship. If it's a one-to-many we don't need to build up a join table.
 *
 * @param {String} collectionName
 * @param {Object} attribute
 * @return {Object}
 * @api private
 */

JoinTables.prototype.parseAttribute = function(collectionName, attribute) {

  var error = '';
  var attr = attribute.val;

  // Check if this is a hasManyThrough attribute,
  // if so a join table doesn't need to be created
  if(hop(attr, 'through')) return;

  // Normalize `collection` property name to lowercased version
  attr.collection = attr.collection.toLowerCase();

  // Grab the associated collection and ensure it exists
  var child = this.collections[attr.collection];
  if(!child) {
    error = 'Collection ' + collectionName + ' has an attribute named ' + attribute.key + ' that is ' +
            'pointing to a collection named ' + attr.collection + ' which doesn\'t exist. You must ' +
            ' first create the ' + attr.collection + ' collection.';

    throw new Error(error);
  }

  // If the attribute has a `via` key, check if it's a foreign key. If so this is a one-to-many
  // relationship and no join table is needed.
  if(hop(attr, 'via') && hop(child.attributes[attr.via], 'foreignKey')) return;

  // If no via is specified, a name needs to be created for the other column
  // in the join table. Use the attribute key and the associated collection name
  // which will be unique.
  if(!hop(attr, 'via')) attr.via = attribute.key + '_' + attr.collection;

  // Build up an object that can be used to build a join table
  var tableAttributes = {
    column_one: {
      collection: collectionName.toLowerCase(),
      attribute: attribute.key,
      via: attr.via
    },

    column_two: {
      collection: attr.collection,
      attribute: attr.via,
      via: attribute.key
    }
  };

  return tableAttributes;

};

/**
 * Build Collection for a single join
 *
 * @param {Object} columns
 * @return {Object}
 * @api private
 */

JoinTables.prototype.buildTable = function(columns) {

  var table = {};
  var c1 = columns.column_one;
  var c2 = columns.column_two;

  table.identity = this.buildCollectionName(columns).toLowerCase();
  table.tableName = table.identity;
  table.tables = [c1.collection, c2.collection];
  table.joinedAttributes = [];
  table.junctionTable = true;

  // Look for a dominant collection property so the join table can be created on the correct connection.
  table.connection = this.findDominantConnection(columns);
  if(!table.connection) {
    var err = "A 'dominant' property was not supplied for the two collections in a many-to-many relationship. " +
        "One side of the relationship between '" + c1.collection + "' and '" + c2.collection + "' needs a " +
        "'domiant: true' flag set so a join table can be created on the correct connection.";

    throw new Error(err);
  }

  // Set a primary key (should probably be refactored)
  table.attributes = {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: 'integer'
    }
  };

  // Add each foreign key as an attribute
  table.attributes[c1.collection + '_' + c1.attribute] = this.buildForeignKey(c1, c2);
  table.attributes[c2.collection + '_' + c2.attribute] = this.buildForeignKey(c2, c1);

  table.joinedAttributes.push(c1.collection + '_' + c1.attribute);
  table.joinedAttributes.push(c2.collection + '_' + c2.attribute);

  return table;

};

/**
 * Build a collection name by combining two collection and attribute names.
 *
 * @param {Object} columns
 * @return {String}
 * @api private
 */

JoinTables.prototype.buildCollectionName = function(columns) {

  var c1 = columns.column_one;
  var c2 = columns.column_two;

  if(c1.collection < c2.collection) {
    return c1.collection + '_' + c1.attribute + '__' + c2.collection + '_' + c2.attribute;
  }

  return c2.collection + '_' + c2.attribute + '__' + c1.collection + '_' + c1.attribute;

};

/**
 * Find the dominant collection.
 *
 * @param {Object} columns
 * @return {String}
 * @api private
 */

JoinTables.prototype.findDominantConnection = function(columns) {

  var c1 = this.collections[columns.column_one.collection];
  var c2 = this.collections[columns.column_two.collection];
  var dominantCollection;

  // Don't require a dominant collection on self-referencing associations
  if(columns.column_one.collection === columns.column_two.collection) {
    return c1.connection;
  }

  dominantCollection = this.searchForAttribute(columns.column_one.collection, 'dominant');
  if(dominantCollection) return c1.connection;

  dominantCollection = this.searchForAttribute(columns.column_two.collection, 'dominant');
  if(dominantCollection) return c2.connection;

  // Don't require a dominant collection for models on the same connection.
  if (c1.connection[0] === c2.connection[0]) {
    return c1.connection;
  }

  return false;

};

/**
 * Search Attributes for an attribute property.
 *
 * @param {String} collectionName
 * @param {String} attributeName
 * @param {String} value (optional)
 * @return {String}
 * @api private
 */

JoinTables.prototype.searchForAttribute = function(collectionName, attributeName, value) {

  var collection = this.collections[collectionName];
  var matching;
  var properties;

  Object.keys(collection.attributes).forEach(function(key) {
    properties = collection.attributes[key];
    if(!value && hop(properties, attributeName)) matching = key;
    if(hop(properties, attributeName) && properties[attributeName] === value) matching = key;
  });

  return matching;

};

/**
 * Build a Foreign Key value for an attribute in the join collection
 *
 * @param {Object} column_one
 * @param {Object} column_two
 * @return {Object}
 * @api private
 */

JoinTables.prototype.buildForeignKey = function(column_one, column_two) {

  var primaryKey = this.findPrimaryKey(column_one.collection);
  var columnName = (column_one.collection + '_' + column_one.attribute);
  var viaName = column_two.collection + '_' + column_one.via;

  return {
    columnName: columnName,
    type: primaryKey.attributes.type,
    foreignKey: true,
    references: column_one.collection,
    on: primaryKey.name,
    onKey: primaryKey.name,
    via: viaName,
    groupKey: column_one.collection
  };

};

/**
 * Filter Out Duplicate Join Tables
 *
 * @param {Array} tables
 * @api private
 */

JoinTables.prototype.uniqueTables = function(tables) {

  var self = this;

  tables.forEach(function(table) {
    var add = true;

    // Check if any tables are already joining these attributes together
    Object.keys(self.tables).forEach(function(tableName) {
      var currentTable = self.tables[tableName];
      if(currentTable.joinedAttributes.indexOf(table.joinedAttributes[0]) === -1) return;
      if(currentTable.joinedAttributes.indexOf(table.joinedAttributes[1]) === -1) return;

      add = false;
    });

    if(hop(self.tables, table.identity)) return;
    if(add) self.tables[table.identity] = table;
  });

};

/**
 * Find a collection's primary key attribute
 *
 * @param {String} collection
 * @return {Object}
 * @api private
 */

JoinTables.prototype.findPrimaryKey = function(collection) {

  var primaryKey = null;
  var attribute;
  var error;

  if(!this.collections[collection]) {
    throw new Error('Trying to access a collection ' + collection + ' that is not defined.');
  }

  if(!this.collections[collection].attributes) {
    throw new Error('Collection, ' + collection + ', has no attributes defined.');
  }

  for(var key in this.collections[collection].attributes) {
    attribute = this.collections[collection].attributes[key];

    if(!hop(attribute, 'primaryKey')) continue;

    primaryKey = {
      name: key,
      attributes: attribute
    };
  }

  if(!primaryKey) {
    error = 'Trying to create an association on a model that doesn\'t have a Primary Key.';
    throw new Error(error);
  }

  return primaryKey;

};

/**
 * Update Collection Attributes to point to the join table instead of the other collection
 *
 * @api private
 */

JoinTables.prototype.linkAttributes = function() {

  for(var collection in this.collections) {
    var attributes = this.collections[collection].attributes;
    this.updateAttribute(collection, attributes);
  }

};

/**
 * Update An Attribute
 *
 * @param {String} collection
 * @param {Object} attributes
 * @api private
 */

JoinTables.prototype.updateAttribute = function(collection, attributes) {

  for(var attribute in attributes) {
    if(!hop(attributes[attribute], 'collection')) continue;

    var attr = attributes[attribute];
    var parent = collection;
    var child = attr.collection;
    var via = attr.via;

    var joined = this.findJoinTable(parent, child, via);

    if(!joined.join) continue;

    // If the table doesn't know about the other side ignore updating anything
    if(!hop(joined.table.attributes, collection + '_' + attribute)) continue;

    this.collections[collection].attributes[attribute] = {
      collection: joined.table.identity,
      references: joined.table.identity,
      on: joined.table.attributes[collection + '_' + attribute].columnName,
      onKey: joined.table.attributes[collection + '_' + attribute].columnName
    };
  }

};

/**
 * Mark Custom Join Tables as a Junction Table
 *
 * If a collection has an attribute with a `through` property, lookup
 * the collection it points to and mark it as a `junctionTable`.
 *
 * @param {String} collection
 * @api private
 */

JoinTables.prototype.markCustomJoinTables = function(collection) {

  var attributes = this.collections[collection].attributes;

  for(var attribute in attributes) {
    if(!hop(attributes[attribute], 'through')) continue;

    var linkedCollection = attributes[attribute].through;
    this.collections[linkedCollection].junctionTable = true;

    // Build up proper reference on the attribute
    attributes[attribute].collection = linkedCollection;
    attributes[attribute].references = linkedCollection;

    // Find Reference Key
    var reference = this.findReference(collection, linkedCollection);
    attributes[attribute].on = reference;

    delete attributes[attribute].through;
  }

};

/**
 * Find Reference attribute name in a set of attributes
 *
 * @param {String} parent
 * @param {String} collection
 * @return {String}
 * @api private
 */

JoinTables.prototype.findReference = function(parent, collection) {

  var attributes = this.collections[collection].attributes;
  var reference;

  for(var attribute in attributes) {
    if(!hop(attributes[attribute], 'foreignKey')) continue;
    if(!hop(attributes[attribute], 'references')) continue;
    if(attributes[attribute].references !== parent) continue;

    reference = attributes[attribute].columnName || attribute;
    break;
  }

  return reference;

};

/**
 * Search for a matching join table
 *
 * @param {String} parent
 * @param {String} child
 * @param {String} via
 * @return {Object}
 * @api private
 */

JoinTables.prototype.findJoinTable = function(parent, child, via) {

  var join = false;
  var tableCollection;

  for(var table in this.tables) {
    var tables = this.tables[table].tables;

    if(tables.indexOf(parent) < 0) continue;
    if(tables.indexOf(child) < 0) continue;

    var column = child + '_' + via;

    if(!hop(this.tables[table].attributes, column)) continue;

    join = true;
    tableCollection = this.tables[table];
    break;
  }

  return { join: join, table: tableCollection };

};

},{"./utils":120,"lodash":121}],119:[function(_dereq_,module,exports){

/**
 * Module Dependencies
 */

var _ = _dereq_('lodash');
var utils = _dereq_('./utils');
var hop = utils.object.hasOwnProperty;

/**
 * Expose References
 */

module.exports = References;

/**
 * Map References for hasMany attributes. Not necessarily used for most schemas
 * but used internally in Waterline. It could also be helpful for key/value datastores.
 *
 * @param {Object} collections
 * @return {Object}
 * @api private
 */

function References(collections) {

  collections = collections || {};
  this.collections = _.clone(collections);

  for(var collection in collections) {
    this.addKeys(collection);
  }

  return this.collections;

}

/**
 * Add Reference Keys to hasMany attributes
 *
 * @param {String} collection
 * @api private
 */

References.prototype.addKeys = function(collection) {

  var attributes = this.collections[collection].attributes;
  var reference;

  for(var attribute in attributes) {
    if(!hop(attributes[attribute], 'collection')) continue;

    // If references have already been configured, continue on
    if(attributes[attribute].references && attributes[attribute].on) continue;

    attributes[attribute].collection = attributes[attribute].collection;

    // Check For HasMany Through
    if(hop(attributes[attribute], 'through')) {
      reference = this.findReference(attributes[attribute].collection.toLowerCase(), attributes[attribute].through.toLowerCase());
      if(!reference) continue;

      attributes[attribute].references = attributes[attribute].through;
      attributes[attribute].on = reference.reference;
      attributes[attribute].onKey = reference.keyName;
      delete attributes[attribute].through;

      continue;
    }

    // Figure out what to reference by looping through the other collection
    reference = this.findReference(collection, attributes[attribute].collection.toLowerCase(), attributes[attribute]);
    if(!reference) continue;

    attributes[attribute].references = attributes[attribute].collection.toLowerCase();
    attributes[attribute].on = reference.reference;
    attributes[attribute].onKey = reference.keyName;
  }

};

/**
 * Find Reference attribute name in a set of attributes
 *
 * @param {String} parent
 * @param {String} collection
 * @param {Object} attribute
 * @return {String}
 * @api private
 */

References.prototype.findReference = function(parent, collection, attribute) {

  if(typeof this.collections[collection] != 'object') {
    throw new Error('Cannot find collection \'' + collection + '\' referenced in ' + parent);
  }

  var attributes = this.collections[collection].attributes;
  var reference;
  var matchingAttributes = [];
  var obj = {};

  for(var attr in attributes) {
    if(!hop(attributes[attr], 'foreignKey')) continue;
    if(!hop(attributes[attr], 'references')) continue;
    if(attributes[attr].references !== parent) continue;

    // Add the attribute to the matchingAttribute array
    matchingAttributes.push(attr);
  }

  // If no matching attributes are found, throw an error because you are trying to add a hasMany
  // attribute to a model where the association doesn't have a foreign key matching the collection.
  if(matchingAttributes.length === 0) {
    throw new Error('Trying to associate a collection attribute to a model that doesn\'t have a ' +
                    'Foreign Key. ' + parent + ' is trying to reference a foreign key in ' + collection);
  }

  // If multiple matching attributes were found on the model, ensure that the collection has a `via`
  // key that describes which foreign key to use when populating.
  if(matchingAttributes.length > 1) {
    if(!hop(attribute, 'via')) {
      throw new Error('Multiple foreign keys were found on ' + collection + '. You need to specify a ' +
                      'foreign key to use by adding in the `via` property to the collection association');
    }

    // Find the collection attribute used in the `via` property
    var via = false;
    var viaName;

    matchingAttributes.forEach(function(attr) {
      if(attr !== attribute.via) return;
      via = attributes[attr];
      viaName = attr;
    });

    if(!via) {
      throw new Error('No matching attribute was found on ' + collection + ' with the name ' + attribute.via);
    }

    reference = via.columnName || viaName;
    obj = { reference: reference, keyName: viaName };
    return obj;
  }

  // If only a single matching attribute was found we can just use that for the reference
  reference = attributes[matchingAttributes[0]].columnName || matchingAttributes[0];
  obj = { reference: reference, keyName: matchingAttributes[0] };
  return obj;

};

},{"./utils":120,"lodash":121}],120:[function(_dereq_,module,exports){


/**
 * Contains a list of reserved words. All others should be stripped from
 * a schema when building.
 */

exports.reservedWords = [
  'defaultsTo',
  'primaryKey',
  'autoIncrement',
  'unique',
  'index',
  'columnName',
  'foreignKey',
  'references',
  'on',
  'through',
  'groupKey',
  'required',
  'default',
  'type',
  'collection',
  'model',
  'via',
  'dominant'
];

/**
 * ignore
 */

exports.object = {};

/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};

},{}],121:[function(_dereq_,module,exports){
module.exports=_dereq_(90)
},{}],122:[function(_dereq_,module,exports){
module.exports=_dereq_(97)
},{}],123:[function(_dereq_,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = _dereq_('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":125}],124:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],125:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":124,"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":128,"inherits":127}],126:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],127:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],128:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],129:[function(_dereq_,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,_dereq_("/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":128}],130:[function(_dereq_,module,exports){
module.exports=_dereq_(124)
},{}],131:[function(_dereq_,module,exports){
module.exports=_dereq_(125)
},{"./support/isBuffer":130,"/usr/local/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":128,"inherits":127}]},{},[1])
(1)
});