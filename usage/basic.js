var Waterline = require('../');

// Instantiate a waterline instance
var orm = Waterline();

// Database methods (DDL)
db.describe();
db.define();
db.drop();
db.addAttribute();
db.removeAttribute();
db.addIndex();
db.removeIndex();

// Model methods (DQL)
Pet.find();
Pet.create();
Pet.update();
Pet.destroy();

// "Deferred" methods
someDeferredThing.exec();
// deferred things in Waterline are promises.  See promises.js.

// Query methods
query.where();
query.limit();
query.skip();
query.sort();
query.paginate();



// Model convenience methods
Pet.findOne();
//model.findBy*  // (dynamic finder)
//model.findOneBy*  // (dynamic finder)

