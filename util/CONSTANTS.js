/**
 * Constants
 *
 * @type {Object}
 */

module.exports = {

  // Operation clause flags:
  OPERATION_MODS: [
    'where', 'select', 'sort', 'from', 'skip', 'limit',
    'count', 'sum', 'average', 'min', 'max',
    'groupBy'
  ],

  // Predicate modifiers
  PREDICATE_MODS: ['or'],

  // Subquery modifiers
  SUBQUERY_MODS: ['whose', 'min', 'max'],

  // Sub-attribute modifiers
  SUBATTR_MODS: [
    'contains', 'startsWith', 'endsWith',
    'in',
    'lessThan', 'greaterThan', 'equals', 'not', '!', '!=', '>', '<', '>=', '<='
  ]

};
