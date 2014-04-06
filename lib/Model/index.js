/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');



/**
 * Construct a Model.
 * (aka "Collection")
 *
 * Each Model instance starts off with a `definition`, which typically
 * includes the identity of the Database where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @param {Object} definition
 */
function Model (definition) {
  definition = definition || {};

  // Merge certain defined properties into the Model
  // instance itself, unless they are already defined.
  _.defaults(this, {
    identity: definition.identity,
    globalId: definition.globalId
  });
}


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
