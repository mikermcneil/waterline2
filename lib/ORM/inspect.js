/**
 * Module dependencies
 */

var util = require('util');
var prettyInstance = require('../../util/prettyInstance');


/**
 * #ORM.prototype.inspect()
 *
 * @return {String} that will be used when displaying
 *                  an ORM instance in `util.inspect`,
 *                  `console.log`, etc.
 */

module.exports = function inspect () {
  return prettyInstance(this, util.format(
    ' • %d model(s)\n'+
    ' • %d datastore(s)\n'+
    ' • %d adapter(s)',
    this.models.length,
    this.datastores.length,
    this.adapters.length
  ));
};
