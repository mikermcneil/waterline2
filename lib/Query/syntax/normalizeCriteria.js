/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var WLUsageError = require('../../WLError/WLUsageError');
var $$ = require('./CONSTANTS');


/**
 * normalizeCriteria()
 *
 * @required    {Object} criteriaTree
 * @optional    {Model} targetModel    [required for non-object, primary key usage in WHERE clause, e.g. `where: [3]`]
 * @optional <- {Object} flags         [optional obj of flags that this method sets for use by caller]
 *
 * @return {Object}
 * @api private
 */
function normalizeCriteria (criteriaTree, targetModel, flags) {

  // console.log('Attempting to normalize criteriaTree:', criteriaTree);

  // Ensure `criteriaTree` is an object
  if (!_.isObject(criteriaTree)) {

    // If not an object, try to interpret some meaning out of it
    if (criteriaTree === false) {
      criteriaTree = { where: false };
    }
    // If true, null or undefined, interpret this as an empty object
    // (i.e. find all the things)
    else if (criteriaTree === undefined || criteriaTree === null || criteriaTree === true) {
      criteriaTree = { where: {} };
    }
    // Otherwise, assume it represents criteria for the primary key:
    else {
      var desiredPkValue = criteriaTree;
      criteriaTree = { where: desiredPkValue };
    }
  }

  // var operationModifiers = _.intersection(Object.keys($$.OPERATION_MODS), Object.keys(criteriaTree));

  // Check if the tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(criteriaTree, doesKeyMatch($$.CRITERIA_MODS));
  // If it doesn't, we'll assume all of the keys belong to a "WHERE"
  if (!criteriaModifiers.length) {
    criteriaTree = {where: criteriaTree};
  }

  // Normalize LIMIT
  // TODO (e.g. coerce to integer, ensure >= 0)

  // Normalize SKIP
  // TODO (e.g. coerce to integer, ensure >= 0)

  // Normalize SORT
  if (_.isString(criteriaTree.sort)) {
    // TODO
  }

  criteriaTree = _.defaults(criteriaTree, {
    select: {},
    where: {},
    limit: 30,
    skip: 0,
    sort: {}
  });


  // Now recursively normalize the other bits
  return _.reduce(criteriaTree, function (memo, sub, key) {

    if (key === 'where') {
      memo.where = normalizeWhereTree(sub, targetModel, flags);
    }
    else if (key === 'select') {
      memo.select = normalizeSelectTree(sub, targetModel, flags);
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
 * @optional  {Model} targetModel   [optional- but required for certain usages]
 * @optional <- {Object} flags
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

  // var operationModifiers = _.intersection(Object.keys($$.OPERATION_MODS), Object.keys(whereTree));

  // Check if this level of the tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(whereTree, doesKeyMatch($$.CRITERIA_MODS));
  if (criteriaModifiers.length) {
    throw new WLUsageError('Invalid operations syntax in query. Should not specify top-level criteria modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
  }

  // Now loop through each attribute/association
  return _.reduce(whereTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub) || _.isDate(sub) || sub instanceof Error) {
      memo[attrName] = sub;
      return memo;
    }

    var subKeys = Object.keys(sub);

    // var criteriaModifiers = _(subKeys)
    //   .intersection ( Object.keys($$.OPERATION_MODS) )
    //   .difference   ( Object.keys($$.SUBQUERY_MODS)  )
    //   .valueOf();

    // Check if the subtree contains any top-level criteria modifiers
    // But ignore any top-level criteria modifiers which also happen to be subquery modifiers (e.g. min, max)
    var criteriaModifiers = _(subKeys)
      .where      ( doesMatch  ($$.CRITERIA_MODS) )
      .difference ( Object.keys($$.SUBQUERY_MODS) )
      .valueOf();
    if (criteriaModifiers.length) {
      throw new WLUsageError('Invalid operations syntax in query. Should not specify operations modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
    }

    // Check if the subtree contains any subattribute modifiers
    // If so, omit keys which are not subattribute modifiers from this level
    // of the criteria object and keep going.
    var objOfSubAttrModifiers = _.pick(sub, doesKeyMatch($$.SUBATTR_MODS));
    if (Object.keys(objOfSubAttrModifiers).length) {
      memo[attrName] = objOfSubAttrModifiers;
      return memo;
    }

    // Check if the subtree contains any subquery modifiers
    var subqueryModifiers = _.where(sub, doesKeyMatch($$.SUBQUERY_MODS));
    // var subqueryModifiers = _.intersection(Object.keys($$.SUBQUERY_MODS), subKeys);

    // If it doesn't, we'll assume all of the keys belong to a "WHOSE", with "MIN:1"
    if (!subqueryModifiers.length) {
      sub = { whose: sub, min: 1 };
    }

    // Now validate/normalize subquery modifier subtrees
    if (sub.whose) {

      // Increment numSubqueries
      if (flags) { flags.numSubqueries++; }

      // Try to determine the `subQueryModel`
      var subQueryModel;
      if (targetModel && sub.from && targetModel.orm) {
        subQueryModel = targetModel.orm.model(sub.from);
      }

      // Take recursive step
      sub.whose = normalizeWhereTree(sub.whose, subQueryModel, flags);
    }

    if (sub.min) {
      // TODO: validate/normalize MIN
      sub.min = sub.min;
    }
    if (sub.max) {
      // TODO: validate/normalize MAX
      sub.max = sub.max;
    }

    // Now, save the subquery object and keep going.
    memo[attrName] = sub;
    return memo;
  }, {});
}




/**
 * normalizeSelectTree()
 *
 * @param  {[type]} selectTree [description]
 * @optional  {Model} targetModel   [optional- but required for certain usages]
 * @optional <- {Object} flags
 * @return {[type]}            [description]
 */
function normalizeSelectTree (selectTree, targetModel, flags) {


  // Check if this level of the tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(selectTree, doesKeyMatch($$.CRITERIA_MODS));
  // var operationModifiers = _.intersection(Object.keys($$.OPERATION_MODS), Object.keys(selectTree));
  if (criteriaModifiers.length) {
    throw new WLUsageError('Invalid criteria syntax in query. Should not specify top-level criteria modifiers (e.g. `where` or `limit`) inside of a `select` clause.  However, you _can_ use these modifiers within an _association_ of a `select` clause.  For example: {select: { name: true, pet: { where: { age: { ">": 12 } } } } }');
  }

  // If the select tree is an empty object, interpret that to mean "all attributes"
  // (only possible if `targetModel` was passed in)
  if (targetModel && _.isEqual(selectTree, {}) || selectTree === '*') {
    selectTree = _.reduce(targetModel.attributes, function ($memo, def, attrName){
      $memo[attrName] = true;
      return $memo;
    }, {});

    // TODO: can probably return early here as an optimization
    //
    // (saves O(|Qπ|) iterations of the loop below, where `Qπ` is the set
    // of attributes in the query's select clause)
  }

  // Now loop through each attribute/association
  return _.reduce(selectTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub)) {
      memo[attrName] = sub;
      return memo;
    }

    // Check if the subtree contains any top-level criteria modifiers
    var criteriaModifiers = _.where(sub, doesKeyMatch($$.CRITERIA_MODS));
    // var operationModifiers = _.intersection(Object.keys($$.OPERATION_MODS), Object.keys(sub));


    // If it doesn't, we'll assume all of the keys belong to another "SELECT"
    if (!criteriaModifiers.length) {
      sub = {select: sub};
    }

    // Increment numJoins
    if (flags) { flags.numJoins++; }

    // Try to determine the `joinModel`
    var joinModel;
    if (targetModel && sub.from && targetModel.orm) {
      joinModel = targetModel.orm.model(sub.from);
    }

    // Now jump back into a recursive normalization
    // (sub-selects are actually full criteria trees)
    sub = normalizeCriteria(sub, joinModel, flags);

    memo[attrName] = sub;
    return memo;
  }, {});

}



/**
 * Configure a case-insensitive check function which will, given
 * an object,  return an array of key names which are recognized
 * `synonyms`.
 *
 * @param  {Object} synonyms
 * @return {Function}
 */

function doesKeyMatch (synonyms) {

  var MAX_DEPTH = 50;

  /**
   * Iterator fn for lodash object cursor.
   *
   * @unused {?} val
   * @param {String} key
   * @return {String[]} array of matching keys
   */
  return function _doesKeyMatchTheseSynonyms (val, key) {

    // Resolve synonym(s) and fold case
    var keyCursor = key;
    var depth = 0;
    // console.log(util.format('_doesKey(%s)MatchTheseSynonyms(%s):',key, util.inspect(synonyms, false, null)));
    while (depth<MAX_DEPTH && typeof keyCursor === 'string') {
      // console.log('checked synonyms for keyCursor:',keyCursor);
      depth++;
      keyCursor = synonyms[keyCursor];
    }
    return keyCursor === true;
  };
}




/**
 * Configure a case-insensitive check function which will, given
 * an array of strings, return the ones which are recognized `synonyms`.
 *
 * @param  {Object} synonyms
 * @return {Function}
 */

function doesMatch (synonyms) {

  var MAX_DEPTH = 50;

  /**
   * Iterator fn for lodash array cursor.
   *
   * @param {String} item
   * @return {String[]} array of matching items
   */
  return function _doesMatchTheseSynonyms (val, item) {

    // Resolve synonym(s) and fold case
    var cursor = item;
    var depth = 0;
    // console.log(util.format('_doesitem(%s)MatchTheseSynonyms(%s):',item, util.inspect(synonyms, false, null)));
    while (depth<MAX_DEPTH && typeof cursor === 'string') {
      // console.log('checked synonyms for cursor:',cursor);
      depth++;
      cursor = synonyms[cursor];
    }
    return cursor === true;
  };
}



module.exports = normalizeCriteria;




// ------------------------------------------------------------------------------------
// Example criteria object for reference:
//
// x === People over 40 who have at least two (but no more than three) friends under 30.
// ------------------------------------------------------------------------------------
//
// var x = {
//
//   from: 'person',
//
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
//
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

