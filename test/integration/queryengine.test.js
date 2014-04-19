var ORM = require('../../lib/ORM');

var orm = new ORM({
  models: {
    foo: {}
  }
});

var q = orm.query({
  orm: orm,
  operations: {
    method: 'find',
    from: 'foo',
    where: {
      id: [1,2]
    },
    select: {
      // name: true,
      id: true
    }
  }
});

var r = q.exec(function(err, results) {
  if (err) return console.error('Error:\n', err);
  else {
    console.log('Searched:',q);
    console.log('Results:\n', results);
  }
});
