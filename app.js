'use strict';

/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var request = require('request');
var Q = require('q');
var _ = require('lodash');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// Scrap target page
app.post('/api/scrap_url',
// chapter page
function(req, res, next) {

  req.target_url = req.param('target_url');
  console.log('Chapter page: scraping %s', req.target_url);

  if (req.target_url) {

    var counter = 0;
    (function getPage() {
      counter++;
      request({url: req.target_url, timeout: 10000}, function(err, response, body) {
        if (err) {
          if (counter < 3) {
            console.log('Failed scraping page %s, retry (%d attempts)', req.target_url, counter + 1);
            getPage();
          } else {
            next({message: 'Requesting target_url timeout.'});
          }
          return;
        }

        console.log('Got response code %d', response.statusCode);
        if (response.statusCode === 200) {

          var urls = getChapterPageUrl(body);
          if (urls) {
            console.log('Got %d page links', urls.length);

            var gotUrls = [];

            _.forEach(urls, function(url, i) {
              console.log('Scraping page # %d', i + 1);

              var got = Q.defer();
              gotUrls.push(got.promise);

              var counter = 0;

              (function getUrl() {
                counter++;
                request({url: url, timeout: 10000, pool: {maxSockets: 3}}, function(err, response, body) {
                  if (err) {
                    if (counter < 3) {
                      console.log('Failed scraping page # %d, retry (%d attempts)', i + 1, counter + 1);
                      getUrl();
                    } else {
                      console.log('Failed scraping page # %d after %d attempts', i + 1, counter);
                      got.reject('timeout');
                    }
                  } else {
                    var src = getPageImageSrc(body);
                    if (src) {
                      console.log('Finish scraping page # %d', i + 1);
                      got.resolve(src);
                    }
                  }
                });
              })();

            });

            Q.allSettled(gotUrls).then(function(results) {
              var srcs = []
                , failedCounter = 0;
              results.forEach(function(result) {
                if (result.state === "fulfilled") {
                  srcs.push({src: result.value});
                } else {
                  failedCounter++;
                  srcs.push({src: '/img/timeout.png'});
                }
              });
              console.log('All pages scraping finished, %d failed. Enjoy!', failedCounter);
              res.json({type: 'chapter_page', urls: srcs});
            });

          } else {
            req.book_body = body;
            next();
          }
        }
      });
    })();

  } else {
    next({message: 'No target_url given.'});
  }
},
// book page
function(req, res, next) {
  console.log('Book page: scraping %s', req.target_url);
  var chapters = getBookChapters(req.book_body);
  if (chapters) {
    console.log('Got %d chapters', chapters.length);
    res.json({type: 'book_page', chapters: chapters});
  } else {
    next({message: 'target_url is neither a chapter page nor a book page'});
  }
},
function(err, req, res, next) {
  console.log(err.message);
  res.send(404, err);
});

// Make sure every page leads to homepage
app.get(/^(?!\/api).*/, function(req, res) {
  res.sendfile('./public/index.html');
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


function getChapterPageUrl(content) {
  var match = /<dd class="pagebar">([\s\S]+?)<\/dd>/.exec(content)
  if (match) {
    var string = match[1];
    var urls = [];
    var match;
    while (match = /\s+(<a.+?>.+?<\/a>)([\s\S]+)/.exec(string)) {
      urls.push(/href="(.+?\.html)"/.exec(match[1])[1]);
      string = match[2];
    }
    return urls;
  }
}


function getPageImageSrc(content) {
  var matchEncodedStr = /document\.write\(eee\('(.+)'\)\);/.exec(content);
  if (matchEncodedStr) {
    var encodedStr = matchEncodedStr[1];
    var decodedStr = new Buffer(encodedStr, 'base64').toString('utf8');
    var imageUrl   = /src="(.+\.(?:jpg|jpeg|png))"/.exec(decodedStr)[1];
    return imageUrl;
  }
}


function getBookChapters(content) {
  var match = /<ul\s.*id="chapter">([\s\S]+?)<\/ul>/.exec(content);
  if (match) {
    var items = match[1].match(/<a.+?>.+?<\/a>/g);
    var chapters = [];
    for (var i = 0; i < items.length; i++) {
      var href = /href="(.+?)"/i.exec(items[i]);
      var title = /title="(.+?)"/i.exec(items[i]);
      if (href && title) {
        chapters.push({href: href[1], title: title[1]});
      }
    }
    return chapters;
  }
}
