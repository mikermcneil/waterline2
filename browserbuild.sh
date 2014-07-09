rm browser.min.js.gz
browserify -e ./index.js -s Waterline -o ./browser.js
# browserify -e ./index.js -o ./browser.js
du -h browser.js
uglifyjs browser.js > browser.min.js
du -h browser.min.js
gzip browser.min.js
du -h browser.min.js.gz
