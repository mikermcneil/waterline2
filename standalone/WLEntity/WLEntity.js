// 'use strict';

/**
 * Module dependencies
 */

var _ = require('lodash');

var WLError = require('root-require')('standalone/WLError');



/**
 * #WLEntity
 *
 * Utility class with static methods for working with most
 * Waterline classes and instances.  In particular, this
 * module provides helpful methods for any classes, instances,
 * or sets of such which key off of an `identity` property.
 *
 * (currently most useful for Models, Adapters, and Datastores)
 */
function WLEntity () {

}


/**
 * @param  {Array} array
 * @return {Object}
 * @api private
 */
WLEntity.toObject = function (array) {
  if (_.isPlainObject(array)) return array;
  if (!array) return {};

  return _.reduce(array, function (memo, item) {
    // Skip items w/o an identity
    if (!item.identity) return memo;
    memo[item.identity] = item.identity;
    return memo;
  }, {});
};

/**
 * @param  {Object} obj
 * @return {Array}
 * @api private
 */
WLEntity.toArray = function (obj) {
  if (_.isArray(obj)) return obj;
  if (!obj) return [];

  return _.reduce(obj, function (memo, item, key) {
    item.identity = item.identity || key;
    memo.push(item);
    return memo;
  }, []);
};


/**
 * Serialize a single entity `definition` and, optionally,
 * its `identity` into a standard POJO.
 *
 * @param  {[type]} identity   [description]
 * @param  {[type]} definition [description]
 * @return {Object}
 * @api private
 */
WLEntity.normalize = function (identity, definition) {

  // `identity` argument is optional
  if (typeof identity === 'object') {
    definition = identity;
    identity = undefined;
  }

  // `definition` is optional, and should be an object
  definition = definition || {};

  // Apply `identity` argument to definition, if relevant
  if (identity && typeof identity === 'string') {
    // Make sure the first letter is lower-cased
    // (Note that this may be adapted eventually to lowercase all
    // characters, since lookups are case-insensitive anyway)
    identity = identity.substr(0,1).toLowerCase() + identity.substr(1);
    definition.identity = identity;
  }

  return definition;
};


/**
 * See: http://en.wikipedia.org/wiki/Proper_name_(philosophy)
 * @param  {Thing} thing
 * @return {Object}
 */
WLEntity.thesaurus = function (thing) {
  return {
    possessive: thing.identity + '\'s', // erm.. uh.. it's fine, really.
    proper: thing.identity[0].toUpperCase() + thing.identity.slice(1),
    singular: thing.identity,
    plural: thing.identity + 's', // erm.. uh.. it's fine, really.
  };
};


/**
 * @param  {[type]} things [description]
 * @param  {[type]} Thing  [description]
 * @return {Function}
 */
WLEntity.identifier = function (things, Thing) {

  /**
   * @this {ORM}
   * @param  {[type]} identity   [description]
   * @param  {[type]} definition [description]
   * @return {[type]}            [description]
   * @api private
   */
  return function _identifyThing (identity, definition) {

    definition = WLEntity.normalize(identity, definition);

    // If another Thing already exists amongst these `things`
    // with the specified identity, overwrite it.
    _.bind(WLEntity.forgetter(things), this)(definition.identity);

    definition.orm = this;
    var newThing = new Thing(definition);
    this[things].push(newThing);

    // Refresh the ORM to ensure the new entity is hooked up nicely
    // (if it fails, it will fail silently------ for now...)
    this.refresh();

    return this;
  };
};


/**
 * @param  {[type]} things [description]
 * @return {Function}
 * @api private
 */
WLEntity.forgetter = function (things) {

  /**
   * @this {ORM}
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function _forgetThing (identity) {
    _.reject(this[things], function (thing) {
      return thing.identity.toLowerCase() === identity.toLowerCase();
    });
    return this;
  };
};

/**
 * @param  {[type]} things
 * @return {Function}
 * @api private
 */
WLEntity.getter = function (things) {


  /**
   * Case-insensitive identity-based lookup.
   *
   * @this {ORM}
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function _getThing (identity) {
    return _.find(this[things], function (thing) {
      return thing.identity.toLowerCase() === identity.toLowerCase();
    });
  };
};


/**
 * Returns whether the specified object (`obj`) is an instance
 * of the constructor in the current `this` context.
 *
 * @param  {this?} obj
 * @return {Boolean}
 * @static
 */
WLEntity.qualifier = function isInstanceOfMe (obj) {
  return typeof obj === 'object' && obj instanceof this;
};



module.exports = WLEntity;
