/**
 * Module dependencies
 */

var util = require('util');

var Relational = require('../Relational');

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
 * @implements {Relational}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Junction (definition) {

  // Call superclass constructor (Relational)
  Junction.super_.apply(this, [definition]);

}

// Qualifier
Junction.isJunction = WLEntity.qualifier;

// Junction implements Relational.
util.inherits(Junction, Relational);


module.exports = Junction;
