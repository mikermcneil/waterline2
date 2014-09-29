# Module Dashboard

The current implementation status, immediate-term plans, and future goals of this repository.

> ###### Feature Requests
>
> We welcome feature requests as edits to the "Backlog" section below.
>
> Before editing this file, please check out [How To Contribute to ROADMAP.md](https://gist.github.com/mikermcneil/bdad2108f3d9a9a5c5ed)- it's a quick read :)
>
> Also take a second to check that your feature request is relevant to Sails core and not one of its dependencies (e.g. Waterline, one of its adapters, one of the core generators, etc.)  If you aren't sure, feel free to send the PR here and someone will make sure it finds its way to the right place.  Note that (for now) core hooks reside in Sails core and so relevant feature requests for a specific hook _do_ belong in this file.



## Build Status

| Release                                                                                                                 | Install Command                                                | Build Status
|------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -----------------
| [![NPM version](https://badge.fury.io/js/waterline2.png)](https://github.com/mikermcneil/waterline2/tree/stable) _(stable)_       | `npm install waterline2@git://github.com/mikermcneil/waterline2.git#stable`                                          | [![Build Status](https://travis-ci.org/mikermcneil/waterline2.png?branch=stable)](https://travis-ci.org/mikermcneil/waterline2) |
| [edge](https://github.com/mikermcneil/waterline2/tree/master)                                                                | `npm install waterline2@git://github.com/mikermcneil/waterline2.git` | [![Build Status](https://travis-ci.org/mikermcneil/waterline2.png?branch=master)](https://travis-ci.org/mikermcneil/waterline2) |



## Timeline

~~We'll see how this goes.  Who knows?  Maybe early-mid 2015 or maybe never- depends.  But I wanted to jot down the ideas now rather than letting them fester.~~

~~Actually, part of this module will likely be used in the Waterline 0.10 release.~~

I would still expect early-mid 2015 for the full release of this rewrite, but in the mean time, we'll likely be using parts of it in waterline core.


## Roadmap

Our short-to-medium-term roadmap items, in order of descending priority:

_(feel free to suggest things)_


 Feature                                                  | Owner                                                                            | Details
 :------------------------------------------------------- | :------------------------------------------------------------------------------- | :------
 example thing                                            | [@mikermcneil](https://github.com/mikermcneil)                                   | some thing



> TODO: take the following things and put them in the format of the table above.  If things are ~~crossed out~~, that means they're implemented.

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


 Owner                                           | Feature                                                | Details     
 :---------------------------------------------: | :----------------------------------------------------- | :------
 [@mikermcneil](https://github.com/mikermcneil)  | Add support for nested config via env variables        | Actually this is just an example feature request / backlog item.  We could support nested config via env variables by using `__` to represent the `.` (has to be double underscore, single underscore prbly breaks things).  For example: `MYAPP__GENERATOR__OPTIONS__ENGINE` would turn into `generator.options.engine`. (see [tests](https://github.com/mikermcneil/rc/blob/master/test/nested-env-vars.js#L6))






<!--
## Where We Stand


Some of the features below depend on one another.  When in doubt, these tables should always reflect the most conservative outlook of where we stand, using binary metrics (either supported or its not.)

> ###### Legend
>
>   - :white_check_mark: - supported feature
>   - :white_large_square: - feature not yet implemented





### Public API

##### ORM

|                              |                       |
|------------------------------|-----------------------|
| **TODO:** finish this        |

##### Datastore

|                              |                       |
|------------------------------|-----------------------|
| **TODO:** finish this        |


##### Relation

|                              |                       |
|------------------------------|-----------------------|
| `.prototype.find()`          | :white_check_mark: 
| `.prototype.create()`        | :white_large_square:
| `.prototype.update()`        | :white_large_square:
| `.prototype.destroy()`       | :white_large_square:
| `.prototype.findOrCreate()`  | :white_large_square:
| **TODO:** finish this     |

##### Query

|                              |                       |
|------------------------------|-----------------------|
| `.bridge()`                  | :white_check_mark:
| **TODO:** finish this        |



### Private API


##### Transaction

|                              |                       |
|------------------------------|-----------------------|
| **TODO:** finish this        |

##### Adapter

|                              |                       |
|------------------------------|-----------------------|
| `.bridge()`                  | :white_check_mark:
| **TODO:** finish this        |

##### QueryHeap

> Note: Will likely be adapted into a generic buffer heap that can be used for multiple use cases throughout WL2, not just w/i the Query class

The API for this class is likely to change somewhate, since it will likely take over managing buffer identities itself rather than relying on the user to take care of it.  It also needs to store the buffers as an array so that they can overflow through an adapter into the proposed built-in "cache" datastore (i.e. you might choose to use Redis to store the buffer references from your query heaps that don't fit in RAM.  But you might choose to store the records or footprints from the actual _overflowing buffers_ themselves in Mongo, so they can grow bigger.  Similarly you might want to store overflow from the global cache buffer heap in Redis, but a _different_ datastore hosted somewhere else.  you get the idea)

|                              |                       |
|------------------------------|-----------------------|
| `.prototype.malloc()`        | :white_check_mark:
| `.prototype.free()`          | :white_large_square:
| `.prototype.push()`          | :white_check_mark:
| `.prototype.get()`           | :white_check_mark:
| **TODO:** finish this        |
-->
