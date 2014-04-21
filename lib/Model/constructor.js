/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../util/prettyInstance');


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
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 */

function Model (definition) {
  definition = definition || {};
  _.defaults(definition, {
    attributes: {}
  });

  // TODO: get actual primary key, etc. from waterline-schema
  // (already using it in `ORM.prototype.refresh()`)
  this.primaryKey = 'id';

  // Merge properties into the Model instance itself,
  // unless they are already defined.
  _.defaults(this, definition);
}


/**
 * Look up the live Adapter instance for this Model's Database.
 *
 * @return {Adapter}
 */
Model.prototype.getAdapter = function () {
  try {
    var database = _.find(this.orm.databases, { identity: this.database });
    var adapter = _.find(this.orm.adapters, { identity: database.adapter });
    return adapter;
  }
  catch (e) {
    return null;
  }
};

/**
 * Look up the live Database instance for this Model.
 *
 * @return {Database}
 */
Model.prototype.getDatabase = function () {
  try {
    var database = _.find(this.orm.databases, { identity: this.database });
    return database;
  }
  catch (e) {
    return null;
  }
};


/**
 * Return self
 *
 * @return {Model}
 */
Model.prototype.getModel = function () { return this; };

// Base query method
// (constructs a generic Waterline Query pointed at this model)
Model.prototype.query = require('./query');

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

// DDL methods
Model.prototype.describe = require('./describe');
Model.prototype.drop = require('./drop');
Model.prototype.addAttr = require('./addAttr');
Model.prototype.removeAttr = require('./removeAttr');

// Presentation
Model.prototype.inspect = function () {
  return prettyInstance(this, {
    attributes: this.attributes
  }, 'Model <'+(this.globalID || this.identity)+'>');
};


module.exports = Model;
