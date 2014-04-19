/**
 * Define some custom properties on the specified instance/prototype.
 *
 * @param {Query} prototype
 * @api private
 */
module.exports = function defineProperties (prototype) {

  // Provide access to `orm` via `this.orm`
  Object.defineProperty(prototype, 'orm', {
      enumerable: false,
      writable: true
  });

  // Provide access to the QueryCache via `this.cache`
  Object.defineProperty(prototype, 'cache', {
      enumerable: false,
      writable: true
  });
};
