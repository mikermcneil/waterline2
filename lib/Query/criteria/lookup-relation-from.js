/**
 * Module dependencies
 */

var WLError = require('root-require')('standalone/WLError');



/**
 * Given an `orm` and a normalized "from" clause, get the
 * associated Relation instance.
 *
 * @param  {[type]} from [description]
 * @param  {[type]} orm  [description]
 * @return {Relation}
 * @throws {WLError} If unidentifiable `from` entity
 */

module.exports = function lookupRelationFrom (from, orm) {
  var fromUnknownEntityError = new WLError('Unknown `.entity` in query\'s FROM clause.  `from` === '+require('util').inspect(from));

  if (!orm) return;
  if (!from || typeof from !== 'object') throw fromUnknownEntityError;

  switch (from.entity) {
    case 'model': return orm.model(from.identity);
    case 'junction': return orm.junction(from.identity);
    default: throw fromUnknownEntityError;
  }
};
