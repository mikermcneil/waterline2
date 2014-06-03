


  // TODO:
  // At some point, look into decentralizing the data comprising the
  // topology of an ORMs data model into the respective adapters, datastores,
  // and relations rather than storing it in the ORM instance.  This could
  // more-easily enable some interesting integration possiblities between
  // other ontologies at runtime (e.g. public APIs, commercial web services, etc)
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




  // Build association metadata (can probably be replaced by the above)
  // TODO: use waterline-schema for this
  // this.associations = _.reduce(this.attributes, function (memo, attrDef, attrName) {
  //   console.log('is %s an association? :: ', attrName, (_.isObject(attrDef) && (attrDef.model || attrDef.collection)));
  //   if (_.isObject(attrDef) && (attrDef.model || attrDef.collection)) {

  //     var relatedIdentity = attrDef.model || attrDef.collection;
  //     var relatedRelation = orm.model(relatedIdentity);

  //     // actually don't do this:
  //     //
  //     // // Skip this association if the related model/junction doesn't exist yet
  //     // // (fails silently)
  //     // if (!relatedRelation) return memo;

  //     // Build association def
  //     var assoc = {
  //       // The `target` is the model or junction which is
  //       // the target of our population.
  //       target: relatedRelation,

  //       // The `keeper` is the model or junction which
  //       // _actually has_ (or "keeps") the foreign key(s).
  //       keeper: null,

  //       // This object has a key for each model that is _pointed to_.
  //       // That is, these foreign keys are named for the model to
  //       // which they _point_, NOT the model in which they _reside_.
  //       foreignKeys: {}
  //     };

  //     // TODO: get junction from WLSchema
  //     var junction;

  //     console.log('lookng for associations in relation: "%s"', self.identity);

  //     // One-way "hasOne" association
  //     if (attrDef.model) {
  //       assoc.type = '1-->N';
  //       assoc.cardinality = 1;
  //       assoc.oneway = true;
  //       assoc.keeper = self;
  //       assoc.foreignKeys[relatedIdentity] = attrName;
  //       // console.log(' -> identified hasOne association (%s) on relation (%s)', attrName,self.identity);
  //     }
  //     // One-way "hasMany" association
  //     else if (attrDef.collection && !attrDef.via) {
  //       throw new WLUsageError('N-->M (via-less collection) associations are not supported in WL2 yet.');
  //       assoc.type = 'N-->M';
  //       assoc.cardinality = 'n';
  //       assoc.oneway = true;
  //       // junction = orm.junction(attrName+'', {

  //       // });
  //       assoc.keeper = junction;

  //       // assoc.foreignKeys[identity] = junction.foreignKeys[identity];
  //       // assoc.foreignKeys[relatedIdentity] = junction.foreignKeys[relatedIdentity];
  //     }
  //     // Two-way "belongsToMany" association
  //     else if (
  //       attrDef.collection && attrDef.via &&
  //       relatedRelation.attributes[attrDef.via] &&
  //       relatedRelation.attributes[attrDef.via].model
  //     ) {
  //       assoc.type = 'N<->1';
  //       assoc.cardinality = 'n';
  //       assoc.oneway = false;
  //       assoc.keeper = relatedRelation;
  //       assoc.foreignKeys[identity] = attrDef.via;
  //     }
  //     // Two-way "hasMany" association
  //     else if (
  //       attrDef.collection && attrDef.via &&
  //       relatedRelation.attributes[attrDef.via] &&
  //       relatedRelation.attributes[attrDef.via].collection &&
  //       relatedRelation.attributes[attrDef.via].via === attrName
  //     ) {
  //       throw new WLUsageError('N<->M (collection via collection) associations are not supported in WL2 yet.');
  //       // assoc.type = 'N<->M';
  //       // assoc.cardinality = 'n';
  //       // assoc.oneway = false;
  //       // assoc.keeper = junction;
  //       // assoc.foreignKeys[identity] = junction.foreignKeys[identity];
  //       // assoc.foreignKeys[relatedIdentity] = junction.foreignKeys[relatedIdentity];
  //     }

  //     // var isManyToMany = assoc.type === 'N<->M' || assoc.type === 'N-->M';
  //     // console.log('ASSOC ('+identity+'.'+attrName+'):::',assoc);

  //     memo[attrName] = assoc;
  //   }
  //   return memo;
  // }, {});

  // console.log('Refreshed',this.identity, 'and now associations are:',Object.keys(this.associations));
