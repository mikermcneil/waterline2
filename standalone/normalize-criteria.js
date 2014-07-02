/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var _mergeDefaults = require('merge-defaults');


var $$ = require('root-require')('standalone/CRITERIA-MODIFIERS');
var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');
var keysIn = require('root-require')('standalone/keys-in');
var keysNotIn = require('root-require')('standalone/keys-not-in');



/**
 * normalize()
 *
 * See http://db.cs.berkeley.edu/papers/fntdb07-architecture.pdf
 *
 * Responsibilities include:
 *  • parse query syntax
 *  • normalize/rewrite for consistency and to ease execution and optimization
 *  • perform naive optimizations using simple arithmetic and predicate manipulation
 *
 *
 * @required    {Object} criteriaTree
 * @optional    {Relation} targetRelation   [required for non-object, primary key usage in WHERE clause, e.g. `where: [3]`]
 * @optional <- {Object} criteriaMetadata   [optional obj that this method uses to pass back addtl information for use by caller]
 *
 * @return {Object}
 * @api private
 */

function normalize (criteriaTree, targetRelation, criteriaMetadata) {

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

  // Check if the tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(criteriaTree, doesKeyMatch($$.CRITERIA_MODS));
  // If it doesn't, we'll assume all of the keys belong to a "WHERE"
  if (!criteriaModifiers.length) {
    criteriaTree = {where: criteriaTree};
  }

  // Normalize FROM
  criteriaTree = normalizeFromClause(criteriaTree);

  // Normalize LIMIT
  // TODO (e.g. coerce to integer, ensure >= 0)

  // Normalize SKIP
  // TODO (e.g. coerce to integer, ensure >= 0)

  // ------ Normalize SORT -----------------------------------------------------

  if (!criteriaTree.sort) {
    criteriaTree.sort = {};
  }

  // Split string into attr and sortDirection parts (default to 'asc')
  if(_.isString(criteriaTree.sort)) {
    var parts = criteriaTree.sort.split(' ');

    // Set default sort to asc
    parts[1] = parts[1] ? parts[1].toLowerCase() : 'asc';

    // Throw error on invalid sort order
    if(parts[1] !== 'asc' && parts[1] !== 'desc') {
      throw new WLUsageError('Invalid sort criteria :: ' + criteriaTree.sort);
    }

    // Expand criteriaTree.sort into object
    criteriaTree.sort = {};
    criteriaTree.sort[parts[0]] = parts[1];
  }

  if (_.isObject(criteriaTree.sort)) {
    _(criteriaTree.sort)
    .keys()
    .each(function(attrName) {
      // normalize ASC/DESC notation
      if(criteriaTree.sort[attrName] === 'asc') criteriaTree.sort[attrName] = 1;
      if(criteriaTree.sort[attrName] === 'desc') criteriaTree.sort[attrName] = -1;

      // normalize binary sorting criteria
      if(criteriaTree.sort[attrName] === 0) criteriaTree.sort[attrName] = -1;
    });
  }


  // TODO: add support for custom sort functions (impact on this particular module: we would leave a function alone if we saw it)

  // Verify that user either specified a proper object
  // or provided explicit comparator function
  if(!_.isObject(criteriaTree.sort) && !_.isFunction(criteriaTree.sort)) {
    throw new WLUsageError('Invalid `sort` modifier in criteria: '+util.inspect(criteriaTree, false, null));
  }
  // ----- </normalize sort> ---------------------------------------------------


  // Apply one final round of defaults to this level of the tree
  //
  // TODO: evaluate whether this is even necessary anymore?
  //
  criteriaTree = _mergeDefaults(criteriaTree, {
    select: {
      '*': true
    },
    where: {},
    limit: undefined,
    skip: undefined,
    sort: {}
  });


  // This is taken care of in `run.js` now:
  // (only applies in compatiblityMode)
  //
  // Don't apply `limit` or `skip` if this is an aggregate query:
  // var limit = criteriaTree.limit;
  // var skip = criteriaTree.skip;
  // if(criteriaTree.groupBy || criteriaTree.sum || criteriaTree.average || criteriaTree.min || criteriaTree.max) {
  //   delete criteriaTree.limit;
  //   delete criteriaTree.skip;
  // }
  // criteriaTree._unusedLimit = limit;
  // criteriaTree._unusedSkip = skip;


  // Now recursively normalize the other bits
  return _.reduce(criteriaTree, function (memo, sub, key) {

    if (key === 'where') {
      memo.where = normalizeWhereTree(sub, targetRelation, criteriaMetadata);
    }
    else if (key === 'select') {
      memo.select = normalizeSelectTree(sub, targetRelation, criteriaMetadata);
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
 * @optional  {Relation} targetRelation   [optional- but required for certain usages]
 * @optional <- {Object} criteriaMetadata
 * @return {Object|false}
 */
function normalizeWhereTree (whereTree, targetRelation, criteriaMetadata) {

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
  // desired primary key value.  If we were able to definitively infer a relation
  // at some point when parsing this query, we should use its primary key to
  // build the appropriate criteria object.
  else if (!_.isObject(whereTree) && targetRelation) {

    // TODO:
    // if no `targetRelation` is available, emit a warning explaining what happened
    // (because normally whatever was passed in would be treated as a primary key criteria,
    // but if we don't know what the primary key is...)

    var desiredPkValue = whereTree;
    var assumedWhereCriteria = {};
    assumedWhereCriteria[targetRelation.primaryKey] = desiredPkValue;
    return assumedWhereCriteria;
  }
  // If we're at a loss, and no ORM was passed in, throw an error
  // (this is safe because the only way that woudl happen is in the event of
  //  a serious bug, or if this normalization module was being used independently,
  //  in which case a thrown error is the most conventional/descriptive strategy.)
  else if (!_.isObject(whereTree)) {

    throw new WLUsageError('Could not parse/normalize part of the `where` criteria: '+util.inspect(whereTree));
  }


  // Check if this WHERE tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(whereTree, doesKeyMatch($$.CRITERIA_MODS));
  if (criteriaModifiers.length) {
    throw new WLUsageError('Invalid criteria syntax in query. Should not specify top-level criteria modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
  }


  // Check if this WHERE tree contains a top-level "like" modifier
  // This is a special case to support the `findLike()` dynamic finder and `like` syntax
  // that has been around since Waterline/Sails ~v0.7 as an affordance for doing simple search
  // queries; e.g.
  // ```
  // User.find({like: 'natalie'})
  // ```
  if (whereTree.like) {

    // If top-level `like` clause is specified as an object of attrs, just invert it
    if (_.isObject(whereTree.like)) {
      _.forEach(whereTree.like, function (likeWhat, attrName) {
        whereTree[attrName] = {like:likeWhat};
      });
    }

    // If it's NOT an object, we'll assume its the fuzzy search value,
    // and attach it to every attribute as a %SQL LIKE%-style criteria.
    else {
      // Expand `like` using the targetRelation's schema if possible.
      if (targetRelation) {

        // Add a LIKE subattribute modifier object for each non-association attribute
        // in targetRelation, then delete the
        _.forEach(targetRelation.attributes, function (attrDef, attrName) {
          if (!(attrDef.model||attrDef.collection)) {
            // console.log('adding new like thing for %s:', attrName, whereTree.like);
          // TODO: use criteriaUnion() instead of smashing whatever's there already
            whereTree[attrName] = { like: whereTree.like };
          }
        });
      }
      // If no `targetRelation` is available, just ignore the top-level `like` entirely
      else {
        // TODO: emit a warning explaining what happened
      }
    }


    // Finally, either way, remove the lingering top-level `like` modifier.
    delete whereTree.like;
  }


  // Now loop through each attribute/association
  return _.reduce(whereTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub) || _.isDate(sub) || sub instanceof Error) {
      memo[attrName] = sub;
      return memo;
    }

    var subKeys = Object.keys(sub);


    // Check if the subtree contains any top-level criteria modifiers
    // or any subquery modifiers (e.g. whose, min, max)
    var criteriaModifiers = _(subKeys)
      .where      ( keysIn  ($$.CRITERIA_MODS) )
      .difference ( Object.keys($$.SUBQUERY_MODS) )
      .valueOf();
    if (criteriaModifiers.length) {
      throw new WLUsageError('Invalid criteria syntax in query. Should not specify criteria modifiers (e.g. `where` or `limit`) inside of a `where` clause.  To do a nested `where` (i.e. subquery) on an association, use the `whose`, `min`, and/or `max` subquery modifiers.');
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
      if (criteriaMetadata) { criteriaMetadata.numSubqueries++; }

      // Normalize the `from` clause
      sub = normalizeFromClause(sub);

      // Try to determine the actual `subqueryRelation` using
      // the ORM's ontology.
      var subqueryRelation = getAssociatedRelation(sub.from, targetRelation && targetRelation.orm);

      // Take recursive step
      sub.whose = normalizeWhereTree(sub.whose, subqueryRelation, criteriaMetadata);
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
 * @param       {Object}   selectTree
 * @optional    {Relation} targetRelation   [optional- but required for certain usages]
 * @optional <- {Object} criteriaMetadata
 */

function normalizeSelectTree (selectTree, targetRelation, criteriaMetadata) {

  // Normalize '*' syntax
  if (selectTree === '*') {
    selectTree = {
      '*': true
    };
  }

  // Check if this level of the tree contains any top-level criteria modifiers
  var criteriaModifiers = _.where(selectTree, doesKeyMatch($$.CRITERIA_MODS));
  if (criteriaModifiers.length) {
    throw new WLUsageError('Invalid criteria syntax in query. Should not specify top-level criteria modifiers (e.g. `where` or `limit`) inside of a `select` clause.  However, you _can_ use these modifiers within an _association_ of a `select` clause.  For example: {select: { name: true, pet: { where: { age: { ">": 12 } } } } }');
  }


  // TODO: instead, resolve this when actually running the query- since currently this
  // omits any keys which are not in the schema.  i.e. Instead of doing this, normalize
  // to the '*' syntax, which is special and different and means get **everything**,
  // even stuff that's not in the schema.
  //

  // If, in the `selectTree`:
  //  • a '*' (splat) key is present
  //  • no explicit `false` (i.e. "omit key") instructions exist
  // Then we can safely remove all primitive values from the tree.
  // (this allows adapters to effectively ignore the SELECT clause until they're ready)
  if (
    selectTree['*'] &&
    !_.any(selectTree,function _areFalse(value,key){return value===false;})
  ) {
    selectTree = _.omit(selectTree, function _areNotObjectsOrSplatInstruction (value,key){
      return key !== '*' && !_.isObject(value);
    });
  }

    // // If the select tree is an empty object, interpret that to mean:
    // // "all known attributes in schema"
    // // (only possible if `targetRelation` was passed in)
    // if (targetRelation && _.isEqual(selectTree, {})) {
    //   selectTree = _.reduce(targetRelation.attributes, function ($memo, def, attrName){
    //     $memo[attrName] = true;
    //     return $memo;
    //   }, {});

  //   }
  // }

  //
  // TODO: could probably return early here as an optimization in some cases
  //
  // (saves O(|Qπ|) iterations of the loop below, where `Qπ` is the set
  // of attributes in the query's select clause)
  //

  // Now loop through each attribute/association
  return _.reduce(selectTree, function (memo, sub, attrName) {

    // If this is not a subtree, get out
    if (_.isArray(sub) || !_.isObject(sub)) {
      memo[attrName] = sub;
      return memo;
    }

    // TODO: explore this:
    // Pick an object which only contains recognized, top-level
    // Waterline query syntax modifiers
    // var cleanTree = _.pick(sub, keysIn($$.CRITERIA_MODS, $$.WL1_AGGREGATION_MODS, $$.WL1_JOIN_MODS));
    // var topLevelAttrs = _.pick(sub, keysNotIn($$.CRITERIA_MODS, $$.WL1_AGGREGATION_MODS, $$.WL1_JOIN_MODS));
    // topLevelAttrs

    // Check if the tree contains any top-level criteria modifiers
    var criteriaModifiers = _.where(sub, doesKeyMatch($$.CRITERIA_MODS));

    // If it doesn't, we'll assume all of the keys belong to another "SELECT"
    if (!criteriaModifiers.length) {
      sub = {select: sub};
    }

    // Increment numJoins
    if (criteriaMetadata) { criteriaMetadata.numJoins++; }

    // Normalize the `from` clause
    sub = normalizeFromClause(sub);

    // Try to determine the `joinRelation`
    var joinRelation = getAssociatedRelation(sub.from, targetRelation && targetRelation.orm);

    // Now jump back into a recursive normalization
    // (sub-selects are actually full criteria trees)
    sub = normalize(sub, joinRelation, criteriaMetadata);

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
 * Normalize the `from` clause in `subtree`
 *
 * @param {Object} subtree
 * @return {Object}
 */
function normalizeFromClause (subtree) {
  if (_.isObject(subtree.from)) {
    subtree.from = _mergeDefaults(subtree.from, {
      entity: 'model'
    });
  }
  else if (_.isString(subtree.from)||_.isString(subtree.model)) {
    subtree.from = {
      entity: 'model',
      identity: subtree.from||subtree.model
    };
  }
  else if (_.isString(subtree.junction)) {
    subtree.from = {
      entity: 'junction',
      identity: subtree.junction
    };
  }
  else {
    subtree.from = {};
  }
  return subtree;
}


/**
 * Given an `orm` and a normalized "from" clause, get the
 * associated Relation instance.
 *
 * @param  {[type]} from [description]
 * @param  {[type]} orm  [description]
 * @return {Relation|null}
 */
function getAssociatedRelation (from, orm) {
  if (!orm) return;
  switch (from.entity) {
    case 'model': return orm.model(from.identity);
    case 'junction': return orm.junction(from.identity);
  }
}



module.exports = normalize;




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

