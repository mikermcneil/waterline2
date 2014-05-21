/**
 * Query syntax constants
 *
 * @type {Object}
 */

module.exports = {



  //
  // The mapping tables below are designed to be used with a synonym iterator
  // This iterator function maps keys to string values again and again until
  // either: (A) the value resolves to `true` instead of a string (the key IS a
  // valid modifier) or (B) it resolves to `undefined` (the key is NOT a valid
  // modifier)
  // (Note: the synonym iterator's modifier-matching algorithm is case-insensitive)
  //



  // Operation clause flags:
  OPERATION_MODS: {
    where: true,
    select: true,
    sort: true,
    from: true,
    skip: true,
    limit: true,

    // ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    // \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
    // Note:
    // The query syntax for the following aggregation/advanced projection
    // modifiers may change in future versions.  These exist now primarily
    // to make WL1 tests pass.
    count: true,
    sum: true,
    average: true,
    min: true,
    max: true,
    groupBy: true,
    joins: true,
    // /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
    // ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||

    // • No synonyms.

    // Case folding
    //
    // Note:
    // • must include all possible keys, including the synonyms
    // • left-hand-side is always completely lowercase
    groupby: 'groupBy'
  },



  // Predicate modifiers
  PREDICATE_MODS: {
    or: true

    // • No synonyms.
    // • No case folding necessary.
  },



  // Subquery modifiers
  SUBQUERY_MODS: {
    whose: true,
    min: true,
    max: true,

    // • No synonyms.
    // • No case folding necessary.
  },


  // Subattribute modifiiers
  SUBATTR_MODS: {

    // "Platonic", adapter-safe modifiers, with the correct casing
    contains: true,
    startsWith: true,
    endsWith: true,
    like: true,
    in: true,
    '!in': true,
    '>': true,
    '<': true,
    '>=': true,
    '<=': true,
    '===': true,
    '!': true,


    // Synonyms
    'notIn'              : '!in',
    'lessThan'           : '<',
    'greaterThan'        : '>',
    'lessThanOrEqual'    : '<=',
    'lessThanOrEquals'   : '<=',
    'greaterThanOrEqual' : '>=',
    'greaterThanOrEquals': '>=',
    'equals'    : '===',
    'equal'     : '===',
    '='         : '===',
    '=='        : '===',
    'not'       : '!',
    'notEqual'  : '!',
    'notEquals' : '!',
    '!=='       : '!',
    '!='        : '!',


    // Case folding
    //
    // Note:
    // • must include all possible keys, including the synonyms
    // • left-hand-side is always completely lowercase
    notin : 'notIn',
    startswith: 'startsWith',
    endswith: 'endsWith',
    lessthan: 'lessThan',
    greaterthan: 'greaterThan',
    lessthanorequal: 'lessThanOrEqual',
    lessthanorequals: 'lessThanOrEquals',
    greaterthanorequal: 'greaterThanOrEqual',
    greaterthanorequals: 'greaterThanOrEquals',
    notequal: 'notEqual',
    notequals: 'notEquals'
  }

};
