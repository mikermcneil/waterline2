
/**
 * Construct a Model.
 * (aka "Collection")
 *
 * Each Model instance maintains its own configuration, which typically
 * includes the identity of the Database where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @param {Object} opts
 */
function Model (opts) {
  opts = opts || {};

  //
}

// TODO: All methods should definitely be broken out into separate files.


// Base CRUD methods
Model.prototype.find = require('./find');
Model.prototype.create = require('./create');
Model.prototype.update = require('./update');
Model.prototype.destroy = require('./destroy');

// Convenience methods
Model.prototype.findOne = require('./findOne');

// Compound methods
Model.prototype.findOrCreate = require('./findOrCreate');
Model.prototype.updateOrCreate = require('./updateOrCreate');



module.exports = Model;
