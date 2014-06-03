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
 * @private
 */

module.exports = function buildAR (attrDef, relation) {

  // Determine the default, built-in association rule to use
  var useRule;

  // `plural: false` (i.e. `model: *`)
  // (currently, always `hasFK`)
  // (but eventually it could also  be `embedsObject`)
  if (attrDef.association.plural === false) {
    useRule = 'hasFK';
  }

  // `plural: true` (`collection: *`)
  // Could be `viaFK` or `viaJunction`
  // (or eventually, could also be `hasFKArray`, `viaFKArray`, or `embedsArray`)
  else if (attrDef.association.plural) {

    // If another model+attribute exists with a `model` pointed back
    // at this relation's `identity`, the `via-fk` AR should be applied.
    if (
      (function _isViaFKRuleAppropriate (){
        try {

          // Get access to the other relation in the association
          var otherRelation = (function _getOtherRelation (relationType, otherRelationIdentity) {
            switch (relationType) {
              case 'model'   : return relation.orm.model    (otherRelationIdentity);
              case 'junction': return relation.orm.junction (otherRelationIdentity);
            }
          })(attrDef.association.entity, attrDef.association.identity);
          if (!otherRelation) return false;

          // Look up the association attribute
          var otherAttr = otherRelation.attributes[attrDef.association.via];
          if (!otherAttr) return false;

          return (
            otherAttr.association.plural === false &&
            otherAttr.association.identity === relation.identity
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

  // console.log('relation:',relation.identity);
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
    useRule = relation.orm.getDefaultAR(useRule);
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
        parent: relation,
        attrName: attrDef.name,
        attrDef: attrDef
      }, useRule);
    })()
  );

};

