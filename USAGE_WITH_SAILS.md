# How to use Waterline2 with an existing Sails project... TODAY!!!

If you're feeling experimental, you can actually use parts of WL2 right now, wrapped up in the beta version of Waterline and Sails 0.10.

> **Wait, what?**
>
> As of earlier this summer, WL2 actually passes all the original waterline core tests, as well as waterline-adapter-tests for sails-disk and other adapters.  In fact, it seems to more or less work in existing Sails projects.  However, for any of that, you have to use a special branch of the original waterline that calls out to this module.  Please don't rely on this strategy for production use-- wl2 is DEFINITELY not ready for that.  Basically, this branch of waterline rebuilds the ORM on _literally every query_, and there are lots of optimizations that still need to happen in the cursor to make xD/A's practical.
>
> That said, if you're still interested in trying this out....
>
> ###### Step 1
> Clone the `wl2-mike` branch of waterline (the original repo) and install its deps:
>
> ```sh
> $ git clone https://yadayadayada/balderdashy/waterline
> $npm install
> ```
>
> ###### Step 2
> Clone this repo (waterline2) in a DIFFERENT place and install its deps:
> ```sh
> $ git clone ...whatever..
> $ npm install
> ```
>
> ###### Step 3
> Link your local waterline2 so you can use it like it's an actual published thing:
>
> ```sh
> $ cd into/wherever/you/cloned/waterline2
> $ npm link
> ```
>
>
> ###### Step 4
> Link TO waterline2 from inside of your orig. waterline (that you cloned from the wl2-mike branch):
>
> ```sh
> $ cd into/wherever/the/original/waterliine/on/wl2-mike/branch/is
> $ npm link waterline2
> ```
>
> ###### Step 5
> Link your local orig. waterline (same one, on the wl2-mike branch, you get the idea) so that you can use it from other places on your system:
> ```sh
> $ cd into/wherever/the/original/waterliine/on/wl2-mike/branch/is
> $ npm link
> ```
>
> Now wherever else you want, you can run `npm link waterline` to grab a shortcut to your hooked-up branch of the original waterline that relies on WL2 for its `find()` operations.
>
> ```sh
> $ cd my/nodejs-powered/game/about/goldfish
> $ npm link waterline
> $ node
> ```
>
> ```js
> var theOriginalWaterline = require('waterline');
> // But now if you do original waterline things, it'll actually use waterline2 for the finds
> ```
>
>
> ###### And finally, if you want to use this in your Sails app:
>
> If you want to try out Waterline2 in your sails app, you'll need to clone sails, npm install its dependencies, then `rm -rf ./node_modules/waterline` and `npm link waterline`.  Then if you `npm link` from that directory, you'll be able to `npm link sails` in your Sails app to link it to that local version of Sails that's using a linked local copy of Waterline on the wl2-mike branch, which is in turn using a linked copy of waterline2 for its finds.
>
> Whew.
>
>
> TODO: expand this part and actually put better instructions in here, but no time now
>
