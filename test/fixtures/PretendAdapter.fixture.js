/**
 * PretendAdapter (fixture)
 */

module.exports = {
  describe: function (db, modelID, cb) {
    cb(null, {
      attributes: {},
      database: 'default'
    });
  },
  find: function (criteria, cb) {
    setTimeout(function () {
      cb('not a real adapter');
    }, 0);
  }
};
