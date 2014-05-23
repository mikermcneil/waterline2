/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');

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
 * @extends {Model}
 *
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 *
 * @api public
 */

function Junction (definition) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  definition = definition || {};
  _.defaultsDeep(definition, {
    attributes: {}
  });

  // Normalize `tableName`+`cid`+`identity` --> `cid`
  definition.cid = definition.cid||definition.tableName||definition.identity;

  // Normalize `columnName`+`aid`+attrName --> `aid`
  _.mapValues(definition.attributes, function (attrDef, attrName) {
    attrDef.aid = attrDef.aid||attrDef.columnName||attrName;
    return attrDef;
  });

  // TODO: default `schema` flag based on the adapter

  // Merge properties into the Junction instance itself,
  // unless they are already defined.
  _.defaultsDeep(this, definition);

  // Call superclass constructor (Model)
  Junction.super_.apply(this, [this]);

}

// Qualifier
Junction.isJunction = WLEntity.qualifier;

// Junction inherits from Model.
util.inherits(Junction, Model);


module.exports = Junction;
