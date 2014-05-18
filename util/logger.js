/**
 * Module dependencies
 */


// A logger can be passed in as `opts.logger`
// (for use w/ `Deferred.prototype.log()` and throughout the ORM)
// Defaults to console.log + console.error
module.exports = {


  /**
   * Using the appropriate log function, display a
   * warning message.
   *
   * @param  {[type]} warning [description]
   */
  warn: function (warning) {
    console.error('Warning:');
    console.error(warning);
  },


  /**
   * Using the appropriate log function, display the
   * results from a Node-style (`err,result`) callback.
   *
   * @param  {[type]} err    [description]
   * @param  {[type]} result [description]
   */
  results: function (err, result) {

    // var PROMPT_STR = '';
    // try {
    //   require('colors');
    //   PROMPT_STR = PROMPT_STR.cyan;
    // }
    // catch (e) {}

    if (err) {
      console.error();
      console.error(err);
      // console.error(PROMPT_STR);
    }
    else {
      console.log();
      console.log(result);
      // console.log(PROMPT_STR);
    }
  }
};

