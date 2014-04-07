/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var RecordStream = require('../RecordStream');
var Deferred = require('../Deferred');
var WLUsageError = require('../WLError/WLUsageError');
var WLError = require('../WLError');



/**
 * `Database.describe()`
 *
 * @return {Deferred}
 */

//
// TODO: extrapolate shared logic to keep this all DRY as we expand to the other methods
//
module.exports = function describe ( /* modelID, callback */ ) {
  var self = this;

  // Validate usage
  var args = Array.prototype.slice.call(arguments);
  var callback = _.find(args, _.isFunction);
  var modelID = _.find(args, _.isString);
  if (!_.isString(modelID)) {
    return callback(new WLUsageError({reason: 'Invalid usage of describe().  No model identity specified'}));
  }

  // Look up the adapter for our database
  var adapter = _.find(this.orm.adapters, { identity: this.adapter });

  // Check that the adapter supports the requested functionality:
  if (!adapter.describe) {
    var err = new WLUsageError({reason: util.format('`describe()` is not supported by this adapter (`%s`)', adapter.identity )});
    if (_.isFunction(callback)) {
      return callback(err);
    }
    else return this.orm.emit('error', err);
  }

  // Instantiate a Deferred
  var deferred = new Deferred({}, function talkToAdapter (cb) {

    // Ask our adapter to describe the specified Model
    adapter.describe(modelID, function (err, schema) {
      if (err) return cb(new WLError(err));
      else return cb(err, schema);
    });
  });

  // If `callback` was
  //  specified, call `.exec()` immediately.
  if (callback) {
    deferred.exec(callback);
  }

  return deferred;
};
