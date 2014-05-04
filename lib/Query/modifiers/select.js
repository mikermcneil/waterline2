/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * Chainable access to the `select` query modifier.
 *
 * @param  {Object|Array|String} _input
 * @return {Query}
 * @api public
 */

module.exports = function __select__ (_input) {
  var select = {};
  if (_.isString(_input)) {
    select[_input] = true;
  }
  else if (_.isArray(_input)) {
    select = _.reduce(_input, function arrayToObj(memo, attrName) {
      memo[attrName] = true;
      return memo;
    }, {});
  }
  else if (_.isObject(_input)) {
    select = _input;
  }
  this.operations.select = _.merge(this.operations.select, select);

  return this;
};
