
/**
 * Construct a Database.
 * (aka "Connection")
 *
 * Each Database instance maintains its own options,
 * which include configuration for a particular adapter.
 *
 * In most cases, a Database instance also contains a set of
 * one or more Model(s).
 *
 * @constructor
 * @param {Object} opts
 */
function Database (opts) {
  opts = opts || {};
}


Database.prototype.describe = function () {};
Database.prototype.define = function () {};
Database.prototype.drop = function () {};
Database.prototype.addAttribute = function () {};
Database.prototype.removeAttribute = function () {};
Database.prototype.addIndex = function () {};
Database.prototype.removeIndex = function () {};

module.exports = Database;
