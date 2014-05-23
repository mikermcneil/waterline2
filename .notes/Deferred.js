
              //////////////////////////
              /////////////////////// //
              //////////////////// // //
              ///////////////// // // //
              ////////////// // // // //
              /////////// // // // // //
              //////// // // // // // //
              ///// // // // // // // //
              // // // // // // // // //
              // // // // // // // // //
              ///// // // // // // // //
              //////// // // // // // //
              /////////// // // // // //
              ////////////// // // // //
              ///////////////// // // //
              //////////////////// // //
              /////////////////////// //
              //////////////////////////


  // Waterline.Deffered: "emptiness" & "flowing"
  //
  // A Deferred always starts off with `this.empty=false`
  // It also starts off with `this.flowing=false`, with
  // the flow started by a manual call to `.exec()`.
  //
  // @promise users:  Note that `.then()`, `.done()`,
  // and comparable methods call `.exec()` implicitly.
  //
  // Once the Deferred is `flowing`, calling `.exec()` again
  // will have no effect, although it will still bind another
  // callback if one is provided.



  // Waterline.Deferred: Promises & "flowing"
  //
  // The standard usage of Deferred is fundamentally different
  // than that of Promises.  Promises start executing immediately,
  // whereas a Waterline Deferred waits until `.exec()` is called.
  //
  // So how do we handle this?  If you call `then` or `done` on a
  // Waterline deferred, it will put the Deferred in flowing mode
  // immediately (i.e. no further modifications can be safely made
  // before the deferred logic is executed). That is, the logic starts
  // running immediately (well.. almost-- after one cycle of
  // the event loop, i.e. `setTimeout(...,0)`)
