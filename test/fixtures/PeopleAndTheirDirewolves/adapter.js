module.exports = function() {
  return {
    apiVersion: '2.0.0',

    find: function (db, cid, criteria, cb){
      setTimeout(function afterSimulatedLookupDelay () {
        var results = WLTransform(criteria.from.identity, data, criteria).results;
        return cb(null, results);
      }, 0);
    }
  };
};


var data = {
  person: [{
    "createdAt": "2014-06-20T14:06:55.893Z",
    "updatedAt": "2014-06-20T14:06:55.893Z",
    "id": 2
  }, {
    "createdAt": "2014-06-20T14:06:56.950Z",
    "updatedAt": "2014-06-20T14:06:56.950Z",
    "id": 9
  }, {
    "createdAt": "2014-06-20T14:06:56.396Z",
    "updatedAt": "2014-06-20T14:06:56.396Z",
    "id": 3
  }, {
    "createdAt": "2014-06-20T14:06:56.503Z",
    "updatedAt": "2014-06-20T14:06:56.503Z",
    "id": 4
  }, {
    "createdAt": "2014-06-20T14:06:56.595Z",
    "updatedAt": "2014-06-20T14:06:56.595Z",
    "id": 5
  }, {
    "createdAt": "2014-06-20T14:06:56.707Z",
    "updatedAt": "2014-06-20T14:06:56.707Z",
    "id": 6
  }, {
    "createdAt": "2014-06-20T14:06:56.777Z",
    "updatedAt": "2014-06-20T14:06:56.777Z",
    "id": 7
  }, {
    "createdAt": "2014-06-20T14:06:56.863Z",
    "updatedAt": "2014-06-20T14:06:56.863Z",
    "id": 8
  }, {
    "createdAt": "2014-06-20T14:06:55.462Z",
    "updatedAt": "2014-06-20T14:06:55.462Z",
    "id": 1
  }, {
    "createdAt": "2014-06-20T14:06:57.037Z",
    "updatedAt": "2014-06-20T14:06:57.037Z",
    "id": 10
  }, {
    "createdAt": "2014-06-20T14:06:57.115Z",
    "updatedAt": "2014-06-20T14:06:57.115Z",
    "id": 11
  }, {
    "createdAt": "2014-06-20T14:06:57.191Z",
    "updatedAt": "2014-06-20T14:06:57.191Z",
    "id": 12
  }, {
    "createdAt": "2014-06-20T14:06:57.293Z",
    "updatedAt": "2014-06-20T14:06:57.293Z",
    "id": 13
  }, {
    "createdAt": "2014-06-20T14:06:57.375Z",
    "updatedAt": "2014-06-20T14:06:57.375Z",
    "id": 14
  }, {
    "createdAt": "2014-06-20T14:06:57.454Z",
    "updatedAt": "2014-06-20T14:06:57.454Z",
    "id": 15
  }, {
    "createdAt": "2014-06-20T14:06:57.531Z",
    "updatedAt": "2014-06-20T14:06:57.531Z",
    "id": 16
  }, {
    "createdAt": "2014-06-20T14:06:57.605Z",
    "updatedAt": "2014-06-20T14:06:57.605Z",
    "id": 17
  }],






  direwolf: [{
    "createdAt": "2014-06-20T14:06:55.893Z",
    "updatedAt": "2014-06-20T14:06:55.893Z",
    "id": 2
  }, {
    "createdAt": "2014-06-20T14:06:56.950Z",
    "updatedAt": "2014-06-20T14:06:56.950Z",
    "id": 9
  }, {
    "createdAt": "2014-06-20T14:06:56.396Z",
    "updatedAt": "2014-06-20T14:06:56.396Z",
    "id": 3
  }, {
    "createdAt": "2014-06-20T14:06:56.503Z",
    "updatedAt": "2014-06-20T14:06:56.503Z",
    "id": 4
  }, {
    "createdAt": "2014-06-20T14:06:56.595Z",
    "updatedAt": "2014-06-20T14:06:56.595Z",
    "id": 5
  }, {
    "createdAt": "2014-06-20T14:06:56.707Z",
    "updatedAt": "2014-06-20T14:06:56.707Z",
    "id": 6
  }, {
    "createdAt": "2014-06-20T14:06:56.777Z",
    "updatedAt": "2014-06-20T14:06:56.777Z",
    "id": 7
  }, {
    "createdAt": "2014-06-20T14:06:56.863Z",
    "updatedAt": "2014-06-20T14:06:56.863Z",
    "id": 8
  }, {
    "createdAt": "2014-06-20T14:06:55.462Z",
    "updatedAt": "2014-06-20T14:06:55.462Z",
    "id": 1
  }, {
    "createdAt": "2014-06-20T14:06:57.037Z",
    "updatedAt": "2014-06-20T14:06:57.037Z",
    "id": 10
  }, {
    "createdAt": "2014-06-20T14:06:57.115Z",
    "updatedAt": "2014-06-20T14:06:57.115Z",
    "id": 11
  }, {
    "createdAt": "2014-06-20T14:06:57.191Z",
    "updatedAt": "2014-06-20T14:06:57.191Z",
    "id": 12
  }, {
    "createdAt": "2014-06-20T14:06:57.293Z",
    "updatedAt": "2014-06-20T14:06:57.293Z",
    "id": 13
  }, {
    "createdAt": "2014-06-20T14:06:57.375Z",
    "updatedAt": "2014-06-20T14:06:57.375Z",
    "id": 14
  }, {
    "createdAt": "2014-06-20T14:06:57.454Z",
    "updatedAt": "2014-06-20T14:06:57.454Z",
    "id": 15
  }, {
    "createdAt": "2014-06-20T14:06:57.531Z",
    "updatedAt": "2014-06-20T14:06:57.531Z",
    "id": 16
  }, {
    "createdAt": "2014-06-20T14:06:57.605Z",
    "updatedAt": "2014-06-20T14:06:57.605Z",
    "id": 17
  }]
};
