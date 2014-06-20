/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var rootrequire = require('root-require');
var FalseFlag = require('./falseflag');

var WLTransform = require('waterline-criteria');
var Waterline = rootrequire('./');


/**
 * PeopleAndTheirDirewolves (fixture)
 * @return {ORM}
 */

module.exports = function PeopleAndTheirDirewolves (n) {
  n=n||100;

  // Build ontology
  var orm = Waterline()

  .model('Person', {
    datastore: 'default',
    attributes: {

      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      name: { type: 'string' },
      favoriteWolves: {
        collection: 'direwolf',
        association: {
          through: {
            entity: 'model',
            identity: 'person_favoriteWolves',
            via: 'fk0',
            onto: 'fk1'
          }
        }
      },
      raisedWolves: {
        collection: 'direwolf',
        via: 'raisedByHumans',
        association: {
          through: {
            entity: 'model',
            identity: 'person_raisedWolves__wolves_raisedByHumans',
            via: 'fk0',
            onto: 'fk1'
          }
        }
      }

    }
  })

  //
  // Note that `favoriteWolves` and `favoriteHumans` are disjoint sets,
  // whereas `raisedWolves` and `raisedByHumans` are the same set.
  //

  .model('Direwolf', {
    datastore: 'default',
    attributes: {

      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      name: { type: 'string' },
      coatColor: { type: 'string' },
      favoriteHumans: {
        collection: 'person',
        association: {
          through: {
            entity: 'model',
            identity: 'direwolf_favoriteHumans',
            via: 'fk0',
            onto: 'fk1'
          }
        }
      },
      raisedByHumans: {
        collection: 'direwolf',
        via: 'raisedWolves',
        association: {
          through: {
            entity: 'model',
            identity: 'person_raisedWolves__wolves_raisedByHumans',
            via: 'fk1',
            onto: 'fk0'
          }
        }
      }

    }
  })

  // Junctors
  .model('direwolf_favoriteHumans', {
    datastore: 'default',
    attributes: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      fk0: { model: 'direwolf' },
      fk1: { model: 'person' }
    }
  })
  .model('person_favoriteWolves', {
    datastore: 'default',
    attributes: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      fk0: { model: 'person' },
      fk1: { model: 'direwolf' }
    }
  })
  .model('person_raisedWolves__wolves_raisedByHumans', {
    datastore: 'default',
    attributes: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      fk0: { model: 'person' },
      fk1: { model: 'direwolf' }
    }
  })

  // Use a stub adapter w/ fake data
    .datastore('default', {adapter: 'default'})
    .adapter('default', {
      apiVersion: '2.0.0',

      find: function(db, cid, criteria, cb) {
        setTimeout(function afterSimulatedLookupDelay() {
          var results = WLTransform(criteria.from.identity, data, criteria).results;
          return cb(null, results);
        }, 0);
      }
    })
  .refresh();

  // Build mock data
  var modelsAsObj = _.reduce(orm.models, function(m,v,k){m[v.identity]=v;return m;}, {});
  var data = FalseFlag(modelsAsObj, n);

  data.direwolf_favoriteHumans = generateRandomJunctorRecords(
    data.direwolf,
    data.person,
    orm.model('direwolf'),
    orm.model('person'),
    n
  );
  data.person_favoriteWolves = generateRandomJunctorRecords(
    data.person,
    data.direwolf,
    orm.model('person'),
    orm.model('direwolf'),
    n
  );
  data.person_raisedWolves__wolves_raisedByHumans = generateRandomJunctorRecords(
    data.person,
    data.direwolf,
    orm.model('person'),
    orm.model('direwolf'),
    n
  );



  console.log(util.inspect(data, false, null));
  return orm;
};



function generateRandomJunctorRecords(data0, data1, relation0, relation1, n) {
  function sampleRecordPKVal(src, relation) {
    var record = _.sample(src);
    return record[relation.primaryKey];
  }

  var junctorPK = 'id';
  var junctorFK0 = 'fk0';
  var junctorFK1 = 'fk1';

  return _.reduce(_.range(n), function (m,record,i) {
    var jRecord = {};
    jRecord[junctorPK] = i+1||1;
    jRecord[junctorFK0] = sampleRecordPKVal(data0, relation0);
    jRecord[junctorFK1] = sampleRecordPKVal(data1, relation1);
    m.push(jRecord);
    return m;
  }, []);
}
