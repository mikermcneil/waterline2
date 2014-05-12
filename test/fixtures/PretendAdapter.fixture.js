/**
 * PretendAdapter (fixture)
 *
 * Factory which returns the definition of the PretendAdapter fixture.
 * @return {Object}
 */

module.exports = function build_PretendAdapter () {
  return {
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
};

