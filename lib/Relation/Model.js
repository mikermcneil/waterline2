/**
 * Module dependencies
 */

var util = require('util');

var Relation = require('./Relation');

var WLEntity = require('root-require')('standalone/WLEntity');



/**
 * Construct a Model.
 * (aka WL1 "Collection")
 *
 * Each Model instance starts off with a `definition`, which typically
 * includes the identity of the Datastore where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @implements {Relation}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Model (definition) {

  // Call superclass constructor (Relation)
  Model.super_.apply(this, [definition]);
}

// Model implements Relation.
util.inherits(Model, Relation);

// Qualifier
Model.isModel = WLEntity.qualifier;


/**
 * #Model.prototype.getModel()
 *
 * @return {Model}
 *
 * @api public
 */

Model.prototype.getModel = function getModel () {
  return this;
};

module.exports = Model;
