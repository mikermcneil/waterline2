/**
 * Module dependencies
 */

var util = require('util');
var events = require('events').EventEmitter;
var _ = require('lodash');
_.defaults = require('merge-defaults');


/**
 * Construct a Query Cache.
 *
 * QueryCache instances are used for storing and emitting results
 * from the operation runner, back through the integrator, and
 * finally out of the parent Query as a RecordStream.
 *
 * @constructor
 * @extends {EventEmitter}
 */

function QueryCache () {

}

util.inherits(QueryCache, EventEmitter);


module.exports = QueryCache;
