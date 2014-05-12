var ORMFactory = require('root-require')('./test/helpers/buildORMFixture');
var ontology = require('./ontology.fixture');
module.exports = function buildORMFixture () {
  var orm = ORMFactory(ontology);
  orm.bootstrapSync({
    person: require('./person.dataset.fixture'),
    cat: require('./cat.dataset.fixture')
  });
  return orm;
};
