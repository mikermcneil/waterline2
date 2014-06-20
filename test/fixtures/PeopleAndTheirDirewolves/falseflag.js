/**
 * Module dependencies
 */

var genie = require('genie');
var _ = require('lodash');
var util = require('util');
var assert = require('assert');


/**
 * Given an object of named Waterline schemas (`topology`),
 * generate a single prototypal record with fake data for
 * each schema.
 *
 * @param {Object} topology
 * @param  {Integer} n  - number of records to generate
 * @return {Object}
 *
 * Example output:
 * ------------------------------------------------
  { user:
   { name: 'Sherman Jakubowski',
     email: 'Darion_Huels@emilie.io',
     phone: '837.529.7609 x246',
     bestFriend:
      { name: 'Mr. Anya Moen',
        email: 'Emmitt@cecile.co.uk',
        phone: '1-167-856-0004 x85433',
        bestFriend: { '...': '...' },
        pets: [ { '...': '...' }, { '...': '...' } ] },
     pets:
      [ { name: 'Lavada Blanda', owner: { '...': '...' } },
        { name: 'Brendon Abbott', owner: { '...': '...' } } ] },
  pet:
   { name: 'Mr. Keagan Mitchell',
     owner:
      { name: 'Cortez Bayer',
        email: 'Zelma@cortney.us',
        phone: '1-288-928-4716 x96682',
        bestFriend: { '...': '...' },
        pets: [ { '...': '...' } ] } } }
 * ------------------------------------------------
 */

module.exports = function FalseFlag (topology, n, desiredDepth) {

  assert(_.isObject(topology));

  return _.reduce(topology, function eachModel (memo, schema, identity){
    memo[identity] = [];
    _.times(n===undefined?1:n, function (){
      memo[identity].push(genie(buildGenieTemplate(schema.attributes, null, topology, 0, desiredDepth)));
      memo[identity] = _.uniq(memo[identity], function (record) {
        return record['id'];
      });
    });
    return memo;
  }, {});

};




/**
 * Given a Waterline schema definition (`attributes`),
 * generate a genie template.
 *
 * Genie definition reference:
 * https://www.npmjs.org/package/genie
 *
 * @param  {Object} schema [description]
 * @param  {String} hint
 * @param  {Object} topology
 * @return {Object}
 */

function buildGenieTemplate (schema, hint, topology, depth, desiredDepth) {

  // Naively truncate
  // TODO: replace with graph traversal stuff from Waterline
  depth = depth || 0;
  // if (depth > 1) {

    // return { '...': function () { return '...'; } };
  // }

  return _.reduce(schema, function (memo, attribute, attrName) {
    var relatedResource;

    if (attribute.association&& !attribute.association.plural) {
      relatedResource = topology[attribute.association.identity] || {};
      hint = hint || attribute.association.identity;
      if (depth <= desiredDepth) {
        memo[attrName] = {
          template: buildGenieTemplate(relatedResource.attributes, hint, topology, depth+1,desiredDepth)
        };
      }
    }
    else if (attribute.association&&attribute.association.plural) {
      relatedResource = topology[attribute.association.identity] || {};
      hint = hint || attribute.via || attribute.association.identity;
      if (depth <= desiredDepth) {
        memo[attrName] = {
          min: 2,
          max: 5,
          template: buildGenieTemplate(relatedResource.attributes, hint, topology, depth+1,desiredDepth)
        };
      }
    }
    else {
      memo[attrName] = inferPattern(attrName, attribute, hint);

      // Don't allow zero
      if (memo[attrName] === 0) memo[attrName] = 1;
    }

    return memo;
  }, {});
}



/**
 * Given the name of an attribute and its definition,
 * infer the best pattern to use to generate fake data for it.
 *
 * @param  {String} attrName
 * @param  {Object} attribute
 * @return {String}           [pattern name]
 */
function inferPattern (attrName, attribute, hint) {

  // Interpret string type shorthand
  if (_.isString(attribute)) {
    attribute = { type: attribute };
  }

  var guess;

  // Make a best guess based on the attribute name
  guess = guess || recognize(attrName);

  // Make a best guess based on the "hint"
  // (i.e. identity of related model, if relevant)
  guess = guess || recognize(hint);

  // Make a best guess based on the attribute type
  guess = guess || recognize(attribute.type);

  // Default to a random word
  guess = guess || function generateWord () { return _.sample(genie({words:{pattern:'sentence'}}).words.split(' ')); };

  return guess;
}


/**
 * Given a seed string (could be a type, hint, or attribute name)
 * return a genie pattern.
 *
 * @param  {String} seed
 * @return {Object|Function}
 */

function recognize (seed) {

  // Normalize falsy seed to '' to `toLowerCase()` calls work.
  if (!seed) seed = '';

  if (_.contains(PATTERNS, seed)) {
    return { pattern: seed };
  }
  else if (_.contains(PATTERNS, seed.toLowerCase())) {
    return { pattern: seed.toLowerCase() };
  }
  else {

    // Make a best guess using a few heuristics
    switch (seed.toLowerCase()) {
      case 'name'     : return { pattern: 'fullName' };
      case 'phone'    : return { pattern: 'phoneNumber' };
      case 'zip'      : return { pattern: 'zipCode' };
      case 'username' : return { pattern: 'userName' };
      case 'state'    : return { pattern: 'usState' };
      case 'street'   : return { pattern: 'streetAddress' };

      case 'text'   : return { pattern: 'sentence' };

      case 'time'      :
      case 'timestamp' :
      case 'datetime ' :
      case 'date'      : return function generateDateInLastWeek () { return new Date((new Date()).getTime() - Math.random()*1000*60*60*24*7)(); };

      case 'number' :
      case 'integer': return function generateIntegerLessThan50 () { return Math.floor(Math.random()*50); };

      case 'double' :
      case 'float'  : return function generateFloatLessThan50 () { return Math.random()*50; };

      case 'boolean': return function generateFlag () { return Math.random() > 0.5; };
    }

    // If no match, return falsy value
    return null;
  }
}


/**
 * Supported patterns
 * @type {String[]}
 */
var PATTERNS = [
  'firstName',
  'lastName',
  'fullName',
  'zipCode',
  'zipCode5',
  'zipCode9',
  'city',
  'streetName',
  'streetAddress',
  'secondaryAddress',
  'brState',
  'brStateAbbr',
  'ukCounty',
  'ukCountry',
  'usState',
  'usStateAbbr',
  'latitude',
  'longitude',
  'phoneNumber',
  'email',
  'userName',
  'domainName',
  'domainWord',
  'ipAddress',
  'companyName',
  'companySuffix',
  'sentence',
  'paragraph'
];




// Example of doing custom things:
// return function generateFullName () {
//   var tokens = genie({firstName:{pattern:'firstName'}, lastName: {pattern: 'lastName'}});
//   return util.format('%s %s', tokens['firstName'],tokens['lastName']);
// };

