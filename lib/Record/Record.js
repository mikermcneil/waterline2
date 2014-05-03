
/**
 * Module dependencies
 */




/**
 * Construct a Record.
 *
 * Representation of a single record/row in a Model.
 *
 * @constructor
 * @param {Model} model
 * @param {Object} values
 */
function Record (model, values) {

  // `values` is an object representing the attribute values of this Record
  // It's keys corresopnd w/ attribute names of the Model, and its values
  // are any of the following:
  //   - basic data types (strings, integers, booleans, floats, objects, arrays, etc.)
  //   - RecordCollection instances
  //   - Record instances
}

Record.prototype.save = function (cb) {
  // TODO
  cb();
};
Record.prototype.destroy = function (cb) {
  // TODO
  cb();
};
Record.prototype.populate = function (cb) {
  // TODO
  cb();
};


// Make `this.orm` non-enumerable
Object.defineProperty(Record.prototype, 'orm', { enumerable: false, writable: true });

module.exports = Record;
