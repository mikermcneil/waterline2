/**
 * Module dependencies
 */

var _ = require ('lodash');

var AssociationRule = require('./AssociationRule');
var get_association_rule_def = require('./get-builtin-association-rule-def');



/**
 * instantiate_association_rule()
 *
 * Factory method that returns a new AssociationRule given
 * an attribute definition and its parent relation,
 *
 * @param  {[type]} attrDef [description]
 * @param  {[type]} parentRelation [description]
 * @return {AssociationRule}
 * @private
 */

module.exports = function build_association_rule (attrDef, parentRelation) {

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
    useRule = get_association_rule_def({
      ruleType: useRule
    });
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

