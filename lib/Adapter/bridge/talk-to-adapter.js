/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var Deferred = require('root-require')('standalone/Deferred');
var WLError = require('root-require')('standalone/WLError');
var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');

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
