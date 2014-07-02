# Waterline 2.0 Roadmap

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




