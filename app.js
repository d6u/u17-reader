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
var chance = new (require('chance'));
var Url = require('url');

var app = express();
var pool = new http.Agent();

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


// Helpers
var parseBookData = require('./helpers/parse_book_data');


// Models
var Book = require('./models/book');


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
      request({
        url: req.target_url,
        timeout: 10000,
        headers: {
          'X-Forwarded-For': chance.ip(),
          'Client-Ip': chance.ip(),
          'Via': chance.ip()
        },
        pool: pool
      }, function(err, response, body) {
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
                request({
                  url: url,
                  timeout: 10000,
                  headers: {
                    'X-Forwarded-For': chance.ip(),
                    'Client-Ip': chance.ip(),
                    'Via': chance.ip()
                  },
                  pool: pool
                }, function(err, response, body) {
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
  var bookData = parseBookData(req.book_body);

  if (bookData) {
    console.log('Got %d chapters', bookData.chapters.length);
    var book = new Book(bookData);
    book.save().then(res.json.bind(res));
  } else {
    next({message: 'target_url is neither a chapter page nor a book page'});
  }
},
function(err, req, res, next) {
  console.log(err.message);
  res.send(404, err);
});


app.post('/api/get_unseal_stone', function(req, res, next) {

  var reference_url = req.param('reference_url');

  var gotThreeStone = [];

  console.log('Getting unseal stone for "%s"', reference_url);

  _.times(3, function(i) {
    // http://www.u17.com/www/ajax.php?mod=bee&act=bee_invite_user&location=http://www.u17.com/comic/6066.html?u=1511242&_=1388381640121
    var url = Url.format({
      protocol: 'http',
      hostname: 'www.u17.com',
      pathname: '/www/ajax.php',
      query: {
        mod: 'bee',
        act: 'bee_invite_user',
        location: reference_url,
        _: _.now()
      }
    });

    var requestOptions = {
      url: url,
      method: 'GET',
      headers: {
        'X-Forwarded-For': chance.ip(),
        'Client-Ip': chance.ip(),
        'Via': chance.ip()
      },
      pool: pool,
      timeout: 10000
    };

    console.log('Sending #%d request...', i+1);

    var got = Q.defer()
      , counter = 1;
    gotThreeStone.push(got);
    (function sendRequest() {
      request(requestOptions, function(err, response, body) {
        if (response.statusCode === 200) {
          got.resolve();
        } else if (counter <= 3) {
          console.log('#%d request failed, #%d attempt', i+1, counter);
          counter++;
          sendRequest();
        } else {
          console.log('#%d request failed after 3 attempts', i+1);
          got.reject();
        }
      });
    })();
  });

  Q.allSettled(gotThreeStone).then(function(results) {
    var failedCount = 0;
    for (var i = 0; i < results.length; i++) {
      if (results[i].state != 'fulfilled') {
        failedCount++
      }
    }
    if (failedCount === 0) {
      console.log('All request succeeded!');
    } else {
      console.log('Request finished with %d failed', failedCount);
    }
    res.send(200);
  });

});


// Resources
//
require('./controllers/books')(app);


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
