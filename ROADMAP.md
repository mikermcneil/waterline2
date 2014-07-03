# WL2 Status & Roadmap

The current implementation status, medium-term roadmap, and backlog (including feature requests) for the next generation of Waterline housed in this repository.




## Status

|------------------------------|
|                              |
|                              |
|                              |
|                              |
|                              |




## Roadmap

### Timeline

~~We'll see how this goes.  Who knows?  Maybe early-mid 2015 or maybe never- depends.  But I wanted to jot down the ideas now rather than letting them fester.~~

~~Actually, part of this module will likely be used in the Waterline 0.10 release.~~

I would still expect early-mid 2015 for the full release of this rewrite, but in the mean time, we'll likely be using parts of it in waterline core.


### Todos

Here are our pending roadmap items:
(feel free to suggest things)

> if things are ~~crossed out~~, that means they're implemented

#### Procedural

1. Finish updating this roadmap and making more readable to literally anyone else who is not Mike.
2. Add a table showing what methods have been implemented out of what is planned
3. Add standard contribution guide using our template, but add in the stuff we've been talking about to make it easier for folks to quickly add feature requests, ideas, and tweaks using the planned PR/FR automation strategy we're implementing in the Sails repo.

#### Short-term Roadmap

1. ~~Finish the query engine so we can pull it into Waterline v0.x.x.~~
2. ~~Build shim that will allow Waterline v0.x.x to use the query engine.~~
3. ~~Build shim that will allow Waterline v0.x.x adapters to work transparently with WL2.~~
4. ~~Finish making many-to-many associations work~~
5. Implement optimizations to use native joins using middleware-like approach
6. Optimize the operations-shim in wl1 (see `wl2-mike` branch of balderdashy/waterline)
6. Finish robust transaction support so we can pull it into Waterline v0.11.x.

#### Broad Goals

+ ~~Pluggable/optional promise support~~
+ ~~Pluggable/optional switchback support~~
+ ~~Pluggable/optional logger~~
+ Better verbose logging to see queries, query plans, etc.
+ ~~Emit 'error' events on the `orm` instance on uncatchable errors (i.e. when there's no callback)~~
+ ~~Emit 'warning' events on the `orm` instance when we want to pass information back to the user about a near-error we recovered from (or something she might not expect to happen w/ usage normalization/validation)~~
+ Better support client-side usage and relevant requirements:
  + ~~Lightweight~~
  + ~~Fewer dependencies (but holy shit we have to keep lodash)~~
+ Conform to/establish standards that can be used in other languages.
+ ~~Improve nomenclature / overloaded terminology.~~
+ Transactions and optimistic locking (in RecordCollection)

#### DDL/migrations

+ ~~Possibility to modify ontology at runtime-- everything is adjusted when you run `orm.refresh()`~~
+ ~~Includes adding dynamically configured databases~~
+ Expose explicit`.migrate()` usage
+ ~~Make junction strategies (for n<-->m and n-->m associations) configurable at the adapter level (i.e. associations in the schema are really just Queries).  Maybe even at the Query level (i.e. custom joins)~~ (see AssociationRule in the code)

#### Criteria cursor

+ ~~Allows for `whose`-style subqueries (SELECT * FROM foo WHERE (SELECT * FROM bar WHERE ...))~~
+ ~~Allows for proper populate..where..limit..skip..sort..select support~~
+ Can be shared by finders, update, AND destroy
+ Update can accept a values object, OR a map function
+ Sort can be specified as a comparator function
+ Index / cache criteria and their results in a configurable cache adapter


## Backlog

The backlog consists of features which are not currently in the immediate-term roadmap above, but are useful.  We would exuberantly accept a pull request implementing any of the items below, so long as it was accompanied with reasonable tests that prove it, and it doesn't break other core functionality.

<!--
Note for contributors:

====================================================
*** Owner (column) ***
====================================================
Your github handle and a link to your github profile (this helps us keep track of who suggested what).  The core committers may need to ask you for more details, and we'll want to try our best to keep you informed when relevant stuff changes, or if other interested contributors from the community start work on the requested feature and need help)

For example:
[@particlebanana](https://github.com/particlebanana)

or:
[@mikermcneil](https://github.com/mikermcneil)


====================================================
*** Feature (column) ***
====================================================
The topic -- a short summary of what this feature or change is all about.

• (<=8 words please)

• Features can be very specific (e.g. suggesting a new method) or quite broad (e.g. proposing an optimization or new configuration option)  However, backlog items _should always_ be more than "what if?" questions.  They should suggest an at-least-somewhat-thought-through strategy for implementing the feature.

• It's usually easier/shorter/more expressive to write these feature topics as imperative "commands". e.g. `Emit log events instead of configurable logger` is easier to read than `Can we get rid of the log and instead emit events on Waterline?`  There's plenty of space in in the "Details" section to be more eloquent, explain the "why", and so forth. So don't be afraid to sound rude here; we won't be offended :)

• Finally, there's no need to clarify that these topics are related to Waterline.  Obviously, everything in this repo is related to Waterline, right?

For example:
Add `.unpopulate()` method

or:
Support "populate..until"

or:
Support nested config via env variables

====================================================
*** Details (column) ***
====================================================

A more comprehensive description of the feature (but still relatively concise please.)

Try to answer the question: "Given how it currently works, how _should_ it work?"

• <1 paragraph (it has to fit in a table cell)

• If you need to provide more context/examples (which is likely in many cases), please do so using link(s).  If it's a one-off example or more in-depth examination, linking to a gist is usually ideal.

• If you also sent tests in your PR, please include a link to them here.

• Finally, there's no need to clarify that these topics are related to Waterline.  Obviously, everything in this repo is related to Waterline, right?

e.g.
We could support nested config via env variables by using `__` to represent the `.` (has to be double underscore, single underscore prbly breaks things).  For example: `MYAPP__GENERATOR__OPTIONS__ENGINE` would turn into `generator.options.engine`. (see [tests](https://github.com/mikermcneil/rc/blob/master/test/nested-env-vars.js#L6))



======= misc =======
• Don't worry about spacing too much below-- it'll work regardless.  Just make sure the first two columns are spaced appropriately, since it makes it easier for all of us to see what's going on in here when we're editing this file.  In general, please just look at how other people are doing it and match the conventions.

• If anyone knows how to make the links to github user profiles more concise in markdown, please let me know-- it'd be a lot easier to work w/ this if we could make that first column more narrow

Thanks!
~mike

-->

| Owner                                            | Feature                                               | Details     |
|--------------------------------------------------|-------------------------------------------------------|-------------|
| [@mikermcneil](https://github.com/mikermcneil)   | Add support for nested config via env variables       | 
| [@mikermcneil](https://github.com/mikermcneil)   | test2
| [@mikermcneil](https://github.com/mikermcneil)   | test3
| [@mikermcneil](https://github.com/mikermcneil)   | test4
| [@mikermcneil](https://github.com/mikermcneil)   | test5




> #### Feature Requests
>
> We welcome feature requests as pull requests editing the "Feature Requests" section of this file.
>
> Before adding a new item to this list, please ensure the feature you're interested in is not already covered by another row in the table below, or in the roadmap above.  In addition to _new_ feature requests, please feel welcome to submit any suggested edits to feature requests or roadmap items.
>
> BTW- the most helpful feature requests also include a test which fails in the current implementation, and would pass if the requested feature was implemented :)
>
> Thanks!
