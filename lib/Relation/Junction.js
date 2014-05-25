/**
 * Module dependencies
 */

var util = require('util');

var Relation = require('./Relation');

var WLEntity = require('root-require')('standalone/WLEntity');



/**
 * Construct a Junction.
 *
 * A Junction is a special, private model used by Waterline to implement
 * association rules in the relational style.  Junctions are completely
 * optional, but are the default strategy for persisting plural relationships,
 * both 1-way (N-->M) and 2-way (N<->M).
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

function Junction (definition) {

  // Call superclass constructor (Relation)
  Junction.super_.apply(this, [definition]);

}

// Qualifier
Junction.isJunction = WLEntity.qualifier;

// Junction implements Relation.
util.inherits(Junction, Relation);


module.exports = Junction;
