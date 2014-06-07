/**
 * Module dependencies
 */

var util = require('util');

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

  if (!orm) return;
  if (!from || typeof from !== 'object') throw _getFromUnknownEntityError({from: from});

  switch (from.entity) {
    case 'model': return orm.model(from.identity);
    case 'junction': return orm.junction(from.identity);
    default: throw _getFromUnknownEntityError({from: from});
  }
};

function _getFromUnknownEntityError(scope) {
  return new WLError('Unknown `.entity` in query\'s FROM clause.  `from` === '+util.inspect(scope.from));
}
