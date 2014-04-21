/**
 * Module dependencies
 */

var _ = require('lodash');
var WLError = require('../lib/WLError');



/**
 * #WLEntity
 *
 * Utility class with static methods for working with most
 * Waterline classes and instances.  In particular, this
 * module provides helpful methods for any classes, instances,
 * or sets of such which key off of an `identity` property.
 *
 * (currently most useful for Models, Adapters, and Databases)
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
    memo[identity] = item.identity;
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
  if (identity) {
    identity = identity.toLowerCase();
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
 * @return {[type]}        [description]
 */
WLEntity.identifier = function (things, Thing) {

  /**
   * @param  {[type]} identity   [description]
   * @param  {[type]} definition [description]
   * @return {[type]}            [description]
   * @api private
   */
  return function (identity, definition) {
    definition = WLEntity.normalize(identity, definition);

    // If another Thing already exists amongst these `things`
    // with the specified identity, overwrite it.
    if (_.find(this[things], { identity: definition.identity })) {
      _.remove(this[things], { identity: definition.identity });
    }

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
 * @return {[type]}        [description]
 * @api private
 */
WLEntity.forgetter = function (things) {

  /**
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function (identity) {
    _.remove(this[things], { identity: identity });
    return this;
  };
};

/**
 * @param  {[type]} things [description]
 * @return {[type]}        [description]
 * @api private
 */
WLEntity.getter = function (things) {

  /**
   * @param  {[type]} identity [description]
   * @return {[type]}          [description]
   */
  return function (identity) {
    return _.find(this[things], { identity: identity });
  };
};



module.exports = WLEntity;

