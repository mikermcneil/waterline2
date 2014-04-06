
/**
 * Construct a Model.
 * (aka "Collection")
 *
 * Each Model instance maintains its own options, which include
 * the Database where its Records are stored.
 *
 * In most cases, a Model instance also contains a set of
 * one or more Attributes(s).
 *
 * @constructor
 * @param {Object} opts
 */
function Model (opts) {
  opts = opts || {};
}

Model.prototype.find = function () {};
Model.prototype.create = function () {};
Model.prototype.update = function () {};
Model.prototype.destroy = function () {};


module.exports = Model;
