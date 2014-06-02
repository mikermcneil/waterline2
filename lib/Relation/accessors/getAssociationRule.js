/**
 * Module dependencies
 */

var _ = require('lodash');





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
  return _.find(this.associationRules, { attrName: attrName });
};

