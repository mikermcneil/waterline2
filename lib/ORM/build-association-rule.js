/**
 * Module dependencies
 */

var _ = require ('lodash');
var AssociationRule = require('../Relation/AssociationRule');


/**
 * buildAR()
 *
 * Factory method that returns a new AssociationRule given
 * an attribute definition and its parent relation,
 *
 * @param  {[type]} attrDef [description]
 * @param  {[type]} relation [description]
 * @return {AssociationRule}
 */

module.exports = function buildAR (attrDef, relation) {

  // Determine the default, built-in association rule to use
  var useRule;

  // `model: *`
  // (currently, always `hasFK`)
  // (but eventually it could also  be `embedsObject`)
  if (attrDef.association.model) {
    useRule = 'hasFK';
  }

  // `collection: *`
  // Could be `viaFK` or `viaJunction`
  // (or eventually, could also be `hasFKArray`, `viaFKArray`, or `embedsArray`)
  else if (attrDef.association.collection) {

    // If another model+attribute exists with a `model` pointed back
    // at this relation's `identity`, the `via-fk` AR should be applied.
    if (
      (function _isViaFKRuleAppropriate (){
        try {
          var otherAttr = relation.orm.model(attrDef.collection)
          .getAttribute(attrDef.collection.via);
          return otherAttr.model === relation.identity;
        }
        catch (e) { return false; }
      })()
    ) {
      useRule = 'viaFK';
    }
    // If the `via` points at a collection,
    // (bidirectional hasMany (collection-->via<--collection))
    // or if no `via` exists,
    // (unidirectional hasMany (collection-->))
    // the `viaJunction` AR should be used.
    //
    else {
      useRule = 'viaJunction';
    }
  }

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
    useRule = _.merge(useRule, orm.getDefaultAR(useRule));
  }
  // Lower-level, direct overrides (config object syntax)
  else if (_.isObject(useRule)) {
    useRule = _.merge(useRule, useRule);
  }

  // Finally instantiate an AR instance using the rule definition
  // we built up above.
  return new AssociationRule(
    (function _buildCompleteARDefinition() {
      return _.merge({
        parent: relation,
        attrName: attrDef.name,
        attrDef: attrDef
      }, useRule);
    })()
  );

};

