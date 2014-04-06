
// Deferred things in Waterline are promises:
someDeferredThing.then();
someDeferredThing.all();
someDeferredThing.spread();
someDeferredThing.fail();
someDeferredThing.done();
someDeferredThing.catch();

// A promise library can be passed in when instantiating Waterline:
var orm = Waterline({
	promiseLib: require('q')
});

// This allows us to use Waterline on the client without adding tons of weight.
// i.e. we can pass in Angular's promise implementation.

