/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var WLUsageError = require('../lib/WLError/WLUsageError');
var $$ = require('./CONSTANTS');


/**
 * normalizeOperationsTree()
 *
 * @required    {Object} operationsTree
 * @optional    {ORM} orm              [required for non-object, primary key usage in WHERE clause]
 * @optional <- {Object} flags         [optional obj of flags that this method sets for use by caller]
 *
 * @return {Object}
 * @api private
 */
function normalizeOperationsTree (operationsTree, orm, flags) {

  // Default `flags`
  if (flags) {
    flags.numSubqueries = 0;
    flags.numJoins = 0;
  }

  // console.log('Attempting to normalize operationsTree:', operationsTree);

  // Ensure `operationsTree` is an object
  if (!_.isObject(operationsTree)) {

    // If not an object, try to interpret some meaning out of it
    if (operationsTree === false) {
      operationsTree = { where: false };
    }
    // If true, null or undefined, interpret this as an empty object
    // (i.e. find all the things)
    else if (operationsTree === undefined || operationsTree === null || operationsTree === true) {
      operationsTree = { where: {} };
    }
    // Otherwise, assume it represents a desired primary key value:
    else {
      var desiredPkValue = operationsTree;
      operationsTree = { where: desiredPkValue };
    }
  }


  // Check if the tree contains any operations modifiers
  var operationModifiers = _.intersection($$.OPERATION_MODS, Object.keys(operationsTree));

  // If it doesn't, we'll assume all of the keys belong to a "WHERE"
  if (!operationModifiers.length) {
    operationsTree = {where: operationsTree};
  }

  // Normalize SORT
  if (_.isString(operationsTree.sort)) {
    // TODO
  }

  operationsTree = _.defaults(operationsTree, {
    select: {},
    where: {},
    limit: 30,
    skip: 0,
    sort: {}
  });


  // As soon as possible, store the target model for this query in this variable.
  var targetModel;
  if (operationsTree.from && orm) {
    targetModel = orm.model(operationsTree.from);
  }


  // Now recursively normalize the other bits
  return _.reduce(operationsTree, function (memo, sub, key) {

    if (key === 'where') {
      memo.where = normalizeWhereTree(sub, targetModel, flags);
    }
    else if (key === 'select') {
      memo.select = normalizeSelectTree(sub, flags);
    }
    else {
      memo[key] = sub;
    }
    return memo;
  }, {});
}


/**
 *
 * @param  {*} whereTree
 * @param  {Model} targetModel   [optional- but required for certain usages]
 * @optional <- {Model} flags
 * @return {Object|false}
 */
function normalizeWhereTree (whereTree, targetModel, flags) {

  // Handle the non-object case in where criteria (`false`)
  // Short-circuit
  if (!_.isObject(whereTree) && whereTree === false) {
    return false;
  }
  // If true, null or undefined, interpret this as an empty object
  // (i.e. find all the things)
  else if (!_.isObject(whereTree) &&
    (whereTree === undefined || whereTree === null || whereTree === true)
  ) {
    whereTree = {};
    return whereTree;
  }
  // Since its not a criteria object, the `whereTree` value must represent a
  // desired primary key value.  If we were able to definitively infer a model
  // at some point when parsing this query, we should use its primary key to
  // build the appropriate criteria object.
  else if (!_.isObject(whereTree) && targetModel) {
    var desiredPkValue = whereTree;
    var assumedWhereCriteria = {};
    assumedWhereCriteria[targetModel.primaryKey] = desiredPkValue;
    return assumedWhereCriteria;
  }
  // If we're at a loss, and no ORM was passed in, throw an error
  // (this is safe because the only way that woudl happen is in the event of
  //  a serious bug, or if this normalization module was being used independently,
  //  in which case a thrown error is the most conventional/descriptive strategy.)
  else if (!_.isObject(whereTree)) {
    throw new WLUsageError('Could not parse/normalize part of the `where` criteria: '+util.inspect(whereTree));
  }

  // Check if this level of the tree contains any operations modifiers
  var operationModifiers = _.intersection($$.OPERATION_MODS, Object.keys(whereTree));
  if (operationModifiers.length) {
    throw new WLUsageError('Invalid operations syntax in query. Should not specify modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
  }

  // Now loop through each attribute/association
  return _.reduce(whereTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub)) {
      memo[attrName] = sub;
      return memo;
    }

    var subKeys = Object.keys(sub);

    // Check if the subtree contains any operations modifiers
    // But ignore any operations modifiers with are ALSO subquery modifiers (e.g. min, max)
    var operationModifiers = _(subKeys)
      .intersection ( $$.OPERATION_MODS )
      .difference   ( $$.SUBQUERY_MODS  )
      .valueOf();
    if (operationModifiers.length) {
      throw new WLUsageError('Invalid operations syntax in query. Should not specify operations modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
    }

    // Check if the subtree contains any subattribute modifiers
    var subattrModifiers = _.intersection($$.SUBATTR_MODS, subKeys);
    // If it does, get out, it's ok.
    if (subattrModifiers.length) {
      memo[attrName] = sub;
      return memo;
    }

    // Check if the subtree contains any subquery modifiers
    var subqueryModifiers = _.intersection($$.SUBQUERY_MODS, subKeys);

    // If it doesn't, we'll assume all of the keys belong to a "WHOSE", with "MIN:1"
    if (!subqueryModifiers.length) {
      sub = { whose: sub, min: 1 };
    }

    // Now validate/normalize subquery modifier subtrees
    if (sub.whose) {

      // Increment numSubqueries
      if (flags) { flags.numSubqueries++; }

      // Take recursive step
      sub.whose = normalizeWhereTree(sub.whose);
    }
    if (sub.min) {
      // TODO: validate MIN
      sub.min = sub.min;
    }
    if (sub.max) {
      // TODO: validate MAX
      sub.max = sub.max;
    }

    memo[attrName] = sub;
    return memo;
  }, {});
}




/**
 * [normalizeSelectTree description]
 * @param  {[type]} selectTree [description]
 * @optional <- {Model} flags
 * @return {[type]}            [description]
 */
function normalizeSelectTree (selectTree, flags) {

  // Check if this level of the tree contains any operations modifiers
  var operationModifiers = _.intersection($$.OPERATION_MODS, Object.keys(selectTree));
  if (operationModifiers.length) {
    throw new WLUsageError('Invalid operations syntax in query. Should not specify modifiers (e.g. `where` or `limit`) inside of a `select` clause.  However, you _can_ use these modifiers within an _association_ of a `select` clause.  For example: {select: { name: true, pet: { where: { age: { ">": 12 } } } } }');
  }

  // Now loop through each attribute/association
  return _.reduce(selectTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub)) {
      memo[attrName] = sub;
      return memo;
    }

    // Check if the subtree contains any operations modifiers
    var operationModifiers = _.intersection($$.OPERATION_MODS, Object.keys(sub));

    // If it doesn't, we'll assume all of the keys belong to another "SELECT"
    if (!operationModifiers.length) {
      sub = {select: sub};
    }

    // Increment numJoins
    if (flags) { flags.numJoins++; }

    // Now jump back into a recursive normalization
    // (sub-selects are actually full operations trees)
    sub = normalizeOperationsTree(sub);

    memo[attrName] = sub;
    return memo;
  }, {});

}




module.exports = normalizeOperationsTree;
















// Example ops for reference:
// (people over 40 who have at least two (but no more than three) friends under 30)
// var x = {
//   from: 'person',
//   where: {
//     age: { '>': 40 },
//     friends: {
//       min: 2,
//       max: 3,
//       whose: {
//         age: { '<': 30 }
//       }
//     }
//   },

//   select: {
//     id: true,
//     name: true,
//     friends: {
//       select: {
//         id: true,
//         name: true
//       },
//       limit: 5,
//       skip: 0,
//       sort: 'popularity DESC'
//     }
//   }
// };

