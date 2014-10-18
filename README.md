# Waterline 2.0 Draft

> **Please do not use this module in production.**
>
> Waterline2 is not currently ready for production use and is not actively maintained.  _It is only a proposal_ at this point.
>
> **Instead, check out the [current stable version of Waterline](https://github.com/balderdashy/waterline).  It is actively developed and is the core team's main focus.**



Still curious?  Okay.  First, see [Introduction to Waterline2](./Introduction to Waterline2.pdf) for background on what this even is.  Then see see ROADMAP.md for what's planned and the contribution guidelines.  Feel free to send suggestions, etc. as PRs.  If you've caught the bug and are interested in becoming a bigger part of the project, please reach out to @mikermcneil, @particlebanana, or @sgress454 on Twitter.

If you're feeling experimental, you [can actually use parts of WL2 in your existing Sails app right now](./USAGE_WITH_SAILS), as long as you're using the >=0.10.x version of Waterline and/or Sails.  There are some pretty heavy crutches involved, and it's not particularly easy to set up right now, but cool to see nonetheless.  And obviously extremely important for testing if you're looking to get involved as a contributor.  Check out [USAGE_WITH_SAILS.md](./USAGE_WITH_SAILS.md) for details.  As long as you're comfortable with `npm link`, you should have no problem getting it to work.



## Usage

First, clone this repo and run npm install.  Then do:

```sh
$ node
```

And:

```js
var Waterline = require('./');
```

## Making Some ORM(s)

```js
var orm = Waterline({
  models: {
    user: { datastore: 'appDB' }
  },
  datastores:{
    appDB: { adapter: 'wlmemory' }
  },
  adapters:{
    wlmemory: require('./standalone/wl-memory.adapter')
  },
});

console.log(orm);

//------[ORM]------
// • 1 model(s)
// • 1 datastore(s)
// • 1 adapter(s)
//-----------------
```

See [ontologies.md](./docs/ontologies.md) for more details.


## Querying

See [querying.md](./docs/querying.md).

## Constructors

See [constructors.md](./docs/constructors.md).


## Everything Else

See the source code.  Play around with it, have a good time you know


## Contributing

See [ROADMAP.md](./ROADMAP.md). (it's slightly out of date)


## License

MIT
