
/**
 * Construct an ORM.
 *
 * Each ORM instance maintains its own configured options
 * and a set of Databases.  Most applications will only
 * instantiate one ORM.
 *
 * @constructor
 * @param {Object} opts
 */
function ORM (opts) {
  opts = opts || {};
}



// Ontology definition/modification
// These functions should work at any time-- including runtime.
ORM.prototype.Model = function () {};
ORM.prototype.Database = function () {};
ORM.prototype.Adapter = function () {};
ORM.prototype.forgetModel = function () {};
ORM.prototype.forgetAdapter = function () {};
ORM.prototype.forgetDatabase = function () {};

// Example usage:
//
// orm.Model('Foo', { attributes: {} });
// orm.forgetModel('Foo');
//
// orm.Database('larrysMysql', { adapter: '' });
// orm.forgetDatabase('larrysMysql');
//
// orm.Adapter('sails-mysql', require('sails-mysql'));
// orm.forgetAdapter('sails-mysql');

module.exports = ORM;
