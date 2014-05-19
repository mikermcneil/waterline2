/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var prettyInstance = require('../../util/prettyInstance');
var WLUsageError = require('../WLError/WLUsageError');




/**
 * Construct a Model.
 * (aka "Collection")
 *
 * Each Model instance starts off with a `definition`, which typically
 * includes the identity of the Database where its records are stored,
 * as well as one or more attribute(s) and other properties like `schema`.
 * The initial options should be passed down by the ORM instance this
 * Model belongs to.
 *
 * @constructor
 * @param {Object} definition
 *                    -> orm: {ORM}
 *                    -> attributes: {Object}
 *                    -> ...
 */

function Model (definition) {

  // Make `this.orm` non-enumerable
  Object.defineProperty(this, 'orm', { enumerable: false, writable: true });

  definition = definition || {};
  _.defaults(definition, {
    attributes: {}
  });

  // Normalize `tableName`+`cid`+`identity` --> `cid`
  definition.cid = definition.cid||definition.tableName||definition.identity;

  // Normalize `columnName`+`aid`+attrName --> `aid`
  _.mapValues(definition.attributes, function (attrDef, attrName) {
    attrDef.aid = attrDef.aid||attrDef.columnName||attrName;
    return attrDef;
  });

  // TODO: default `schema` flag based on the adapter

  // Merge properties into the Model instance itself,
  // unless they are already defined.
  _.defaults(this, definition);

}

/**
 * Static qualifier method
 * @param  {Model?}  obj
 * @return {Boolean}
 */
Model.isModel = function isModel(obj) {
  return typeof obj === 'object' && obj instanceof Model;
};

/**
 * Refresh this model's associations (i.e. keys/junctions/associated models)
 *
 * @chainable
 * @return {Model}
 */
Model.prototype.refresh = function () {

  // Closure access to `orm`,`identity`,etc. for use below
  var orm = this.orm;
  var identity = this.identity;
  var self = this;

  // TODO:
  // At some point, look into decentralizing the data comprising the
  // topology of an ORMs data model into the respective adapters, databases,
  // and models rather than storing it in the ORM instance.  This could
  // more-easily enable some interesting integration possiblities between
  // other apps, open APIs, and commercial web services at runtime;
  // e.g. consider the following integration:
  //
  // ```
  // var twitter = require('wl-twitter')({ apiKey: '...', apiSecret: '...' });
  // var Tweet = twitter.model('tweet');
  // Tweet.find().limit(30).populate('author').log();
  // ```
  //
  // But now imagine you had these sick-ass runtime ontological morph powers:
  //
  // ```
  // var twitter = require('wl-twitter')({ apiKey: '...', apiSecret: '...' });
  // var Tweet = twitter.model('tweet');
  // var User = myORM.model('user');
  //
  // Tweet.identifyRelation('ourUser').withOne(User).on({
  //   '{{tweet.author}}': '{{user.twitterProviderId}}'
  // });
  // User.identifyRelation('tweets').withMany(Tweet).on({
  //   '{{tweet.author}}': '{{user.twitterProviderId}}'
  // });
  //
  // // Now we can get all the Tweets by any of this app's users:
  // Tweet.find({ ourUser: { '!': null } }).limit(30).populate('author').log();
  // ```


  // Ensure ORM is known -- cannot refresh() without it.
  if (!orm) {
    throw new WLUsageError(util.format('Model "%s" is not attached to an ORM', identity));
  }

  // TODO: get actual primary key, etc. from waterline-schema
  // (already using it in `ORM.prototype.refresh()`)
  this.primaryKey = this.primaryKey||'id';

  // TODO: use waterline-schema for this
  this.associations = _.reduce(this.attributes, function (memo, attrDef, attrName) {
    if (_.isObject(attrDef) && attrDef.model || attrDef.collection) {

      var relatedIdentity = attrDef.model || attrDef.collection;
      var relatedModel = orm.model(relatedIdentity);

      // Skip this association if the model doesn't exist yet
      // (fails silently)
      if (!relatedModel) return memo;

      // Build association def
      var assoc = {
        // The `target` is the model or junction which is
        // the target of our population.
        target: relatedModel,

        // The `keeper` is the model or junction which
        // _actually has_ (or "keeps") the foreign key(s).
        keeper: null,

        // This object has a key for each model that is _pointed to_.
        // That is, these foreign keys are named for the model to
        // which they _point_, NOT the model in which they _reside_.
        foreignKeys: {}
      };

      // TODO: get junction (from WLSchema)
      var junction;


      // One-way "hasOne" association
      if (attrDef.model) {
        assoc.type = '1-->N';
        assoc.cardinality = 1;
        assoc.oneway = true;
        assoc.keeper = self;
        assoc.foreignKeys[relatedIdentity] = attrName;
      }
      // One-way "hasMany" association
      else if (attrDef.collection && !attrDef.via) {
        assoc.type = 'N-->M';
        assoc.cardinality = 'n';
        assoc.oneway = true;
        assoc.keeper = junction;
        assoc.foreignKeys[identity] = junction.foreignKeys[identity];
        assoc.foreignKeys[relatedIdentity] = junction.foreignKeys[relatedIdentity];
      }
      // Two-way "belongsToMany" association
      else if (
        attrDef.collection && attrDef.via &&
        relatedModel.attributes[attrDef.via] &&
        relatedModel.attributes[attrDef.via].model
      ) {
        assoc.type = 'N<->1';
        assoc.cardinality = 'n';
        assoc.oneway = false;
        assoc.keeper = relatedModel;
        assoc.foreignKeys[identity] = attrDef.via;
      }
      // Two-way "hasMany" association
      else if (
        attrDef.collection && attrDef.via &&
        relatedModel.attributes[attrDef.via] &&
        relatedModel.attributes[attrDef.via].collection &&
        relatedModel.attributes[attrDef.via].via === attrName
      ) {
        assoc.type = 'N<->M';
        assoc.cardinality = 'n';
        assoc.oneway = false;
        assoc.keeper = junction;
        assoc.foreignKeys[identity] = junction.foreignKeys[identity];
        assoc.foreignKeys[relatedIdentity] = junction.foreignKeys[relatedIdentity];
      }

      // var isManyToMany = assoc.type === 'N<->M' || assoc.type === 'N-->M';
      // console.log('ASSOC ('+identity+'.'+attrName+'):::',assoc);

      memo[attrName] = assoc;
    }
    return memo;
  }, {});

  return this;
};


/**
 * Look up the live Adapter instance for this Model's Database.
 *
 * @return {Adapter}
 */
Model.prototype.getAdapter = function () {
  try {
    var database = _.find(this.orm.databases, { identity: this.database });
    var adapter = _.find(this.orm.adapters, { identity: database.adapter });
    return adapter;
  }
  catch (e) {
    return null;
  }
};

/**
 * Look up the live Database instance for this Model.
 *
 * @return {Database}
 */
Model.prototype.getDatabase = function () {
  try {
    var database = _.find(this.orm.databases, { identity: this.database });
    return database;
  }
  catch (e) {
    return null;
  }
};


/**
 * Return self
 *
 * @return {Model}
 */
Model.prototype.getModel = function () { return this; };

// Base query method
// (constructs a generic Waterline Query pointed at this model)
Model.prototype.query = require('./query');

// Base CRUD methods
Model.prototype.find = require('./find');
Model.prototype.create = require('./create');
Model.prototype.update = require('./update');
Model.prototype.destroy = require('./destroy');

// Convenience methods
Model.prototype.findOne = require('./findOne');

// Compound methods
Model.prototype.findOrCreate = require('./findOrCreate');
Model.prototype.updateOrCreate = require('./updateOrCreate');

// DDL methods
Model.prototype.describe = require('./describe');
Model.prototype.drop = require('./drop');
Model.prototype.addAttr = require('./addAttr');
Model.prototype.removeAttr = require('./removeAttr');

// Raw private methods
// (These should not be used directly; the API may change. You have been warned!)
Model.prototype._findRaw = require('./private/_findRaw');
Model.prototype._findAndJoinRaw = require('./private/_findAndJoinRaw');
Model.prototype._findWhoseRaw = require('./private/_findWhoseRaw');
Model.prototype._updateRaw = require('./private/_updateRaw');
Model.prototype._destroyRaw = require('./private/_destroyRaw');
Model.prototype._createRaw = require('./private/_createRaw');
Model.prototype._createEachRaw = require('./private/_createEachRaw');

// Presentation
Model.prototype.inspect = function () {
  var props = {
    attributes: this.attributes
  };
  if (this.database) { props.database = this.database; }
  if (this.getAdapter()) { props.adapter = this.getAdapter().identity; }
  return prettyInstance(this, props, 'Model <'+(this.globalID || this.identity)+'>');
};


module.exports = Model;
