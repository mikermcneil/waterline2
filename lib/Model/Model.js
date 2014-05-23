/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

var Relational = require('../Relational');

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
 * @implements {Relational}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Model (definition) {

  // Call superclass constructor (Relational)
  Model.super_.apply(this, [definition]);
}

// Model implements Relational.
util.inherits(Model, Relational);

// Qualifier
Model.isModel = WLEntity.qualifier;

module.exports = Model;
