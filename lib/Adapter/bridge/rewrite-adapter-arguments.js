/**
 * Module dependencies
 */

var _ = require('lodash');


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
  // console.log(opts);
  return _.reduce(opts.adapterUsage, _toRewriteArgument(opts), []);
};



function _toRewriteArgument (opts) {

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

    // console.log('arg:',adapterUsageArg);
    // console.log('matchingRuntimeArg:',matchingRuntimeArg);
    // console.log('indexInBridgeUsage:',indexInBridgeUsage);
    // console.log('all runtime args:', opts.runtimeArgs);

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
        // console.log('pushing relation cid ('+opts.relation.cid+') from ',opts.relation);
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
        physicalCriteria.where = _.reduce(physicalCriteria.where, function (memo, subCriteria, attrName) {
          var attrDef = opts.relation.attributes[attrName];

          // console.log('•••',attrName, attrDef);

          // If attribute is in the relation's logical schema, use its `fieldName`
          // otherwise leave it alone
          memo[attrDef ? attrDef.fieldName : attrName] = subCriteria;
          return memo;
        }, {});

        // console.log('physicalCriteria', physicalCriteria);

        memo.push(physicalCriteria);

        return memo;

      case 'attrValues':
        // || TODO:
        // \/ determine whether this needs to be recursive

        throw new Error('fieldName mapping for `attrValues` not implemented yet');
        // var pAttrValues = _.cloneDeep(matchingRuntimeArg);
        // memo.push(pAttrValues);
        return memo;

      case 'attrValues[]':
        // || TODO:
        // \/ determine whether this needs to be recursive

        throw new Error('fieldName mapping for `attrValues[]` not implemented yet');
        // var pAttrValuesArray = _.cloneDeep(matchingRuntimeArg);
        // memo.push(pAttrValuesArray);
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

  };
}

