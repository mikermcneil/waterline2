/**
 * Module dependencies
 */

var ORM = require('../../lib/ORM');
var _ = require('lodash');


/**
 * @param  {ORM?}  orm
 */
module.exports = function isORM(orm) {
  return typeof orm === 'object' &&
    orm instanceof ORM &&
    _.isArray(orm.models) &&
    _.isArray(orm.databases) &&
    _.isArray(orm.adapters);
};
