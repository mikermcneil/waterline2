/**
 * #Relation.prototype.getAssociationRule()
 *
 * TODO: refactor: make this neater- maybe define an `AssociationRule` class?
 *
 *
 * @this  {Relation}
 * @param  {String} attrName
 * @return {AssociationRule}
 * @api private
 */

module.exports = function getAssociationRule (attrName) {
  return this.associationRules[attrName];
};
