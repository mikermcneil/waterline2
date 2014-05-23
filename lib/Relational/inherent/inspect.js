/**
 * Module dependencies
 */

var prettyInstance = require('root-require')('standalone/prettyInstance');



/**
 * #Model.prototype.inspect()
 *
 * @return {String} that will be used when displaying
 *                  a Model instance via `util.inspect`,
 *                  `console.log`, etc.
 *
 * @api private
 */

module.exports = function inspectModel () {
  var props = {
    attributes: this.attributes
  };
  if (this.datastore) { props.datastore = this.datastore; }
  if (this.getAdapter()) { props.adapter = this.getAdapter().identity; }
  var className = this.constructor.name;
  return prettyInstance(this, props, className+' <'+(this.globalID || this.identity)+'>');
};
