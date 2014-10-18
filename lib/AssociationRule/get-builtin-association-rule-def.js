/**
 * get-builtin-association-rule-def
 *
 * Lookup a built-in association rule (AR) definition.
 * (e.g. `has-fk`, `has-fkarray`, `via-junction`, etc.)
 * These built-in rules for joining, subquerying, migrating, adding,
 * removing, overriding, and identifying / garbage collecting relations
 * attached to associations.
 *
 * @input {String} ruleType
 * @return {Object}          [the appropriate association rule definition]
 * @throws {WLUsageError} If [unknown association rule type]
 */
module.exports = function get_builtin_association_rule_def (inputs) {

  // Case-insensitive
  switch (inputs.ruleType.toLowerCase()) {
    // case hasobject   : require('./Relation/builtin-association-rules/has-object'),
    // case hasarray    : require('./Relation/builtin-association-rules/has-array'),
    case 'hasfk'        : return require('./builtin-rule-defs/has-fk');
    case 'hasfkarray'   : return require('./builtin-rule-defs/has-fkarray');
    case 'viafk'        : return require('./builtin-rule-defs/via-fk');
    case 'viafkarray'   : return require('./builtin-rule-defs/via-fkarray');
    case 'viajunction'  : return require('./builtin-rule-defs/via-junction');
    default:
      throw new WLUsageError('Unknown association rule type: "'+inputs.ruleType+'"');
  }
};
