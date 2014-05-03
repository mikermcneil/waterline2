

### Example Usage

##### With `.exec()`

```javascript
function doAsynchronousStuff (cb) {
  console.log('started doing stuff');
  setTimeout(function () {
    cb(null, 'done');
  }, 100);
}

var someDeferred = new Deferred(doAsynchronousStuff);

someDeferred.exec(function (err) {
  // Here, you'd put logic you want to run after
  // `doAsynchronousStuff` has finished (i.e. called
  // its callback with or without an error).
  console.log('finished the stuff');
});

// started doing stuff
// finished the stuff
```


##### With `.log()`


```javascript
function doAsynchronousStuff (cb) {
  console.log('started doing stuff');
  setTimeout(function () {
    cb(null, 'done');
  }, 100);
}

var someDeferred = new Deferred(doAsynchronousStuff);

someDeferred.log();

// started doing stuff
// done
```
