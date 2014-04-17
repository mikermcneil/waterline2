var ORM = require('../../lib/ORM');
var Query = require('../../lib/Query');


var orm = new ORM({
  models: {
    foo: {}
  }
});
var q = new Query({
  orm: orm,
  operations: {
    method: 'find',
    from: 'foo',
    where: { id: 1 }
  }
});
var r = q.exec(function(err, results) {
  if (err) return console.error('Error:\n', err);
  else console.log('Results:\n', results);
});
