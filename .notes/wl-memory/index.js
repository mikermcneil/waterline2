/**
 * Module dependencies
 */

var WLTransform = require('waterline-criteria');


// The `db` variable holds all of the databases
var db = {};
// The `currentAutoIncrementValues` variable holds each of their next AI values.
var currentAutoIncrementValues = {};

// The adapter interface
module.exports = {

  find: function (criteria, cb) {
    return cb(null, WLTransform(criteria.from, db, criteria).results);
  },
  create: function (values, cb) {
    cb(new Error('Not implemented yet'));
  },
  update: function (criteria, update, cb) {
    cb(new Error('Not implemented yet'));
  },
  destroy: function (criteria, cb) {
    cb(new Error('Not implemented yet'));
  }

};
