/**
 * Module dependencies
 */

var Database = require('../../lib/Database');



/**
 * @param  {Database?}  database
 */
module.exports = function isDatabase(database) {
  return typeof database === 'object' &&
    database instanceof Database;
};
