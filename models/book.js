'use strict';


var getDb = require('../helpers/getDb')
  , Q = require('q')
  , debug = require('util').debug;


var Book = function(attrs) {

  var _this = this;

  this.attrs = attrs;

  this.save = function() {
    var saved = Q.defer();
    getDb(function(db) {
      var books = db.collection('books');
      books.findAndModify(
        {title: _this.attrs.title},
        'title',
        {$set: _this.attrs},
        {'new': true, upsert: true},
        function(err, doc) {
          if (err) throw err;
          saved.resolve(doc);
        }
      );
    });
    return saved.promise;
  };

  this.set = function(name, value) {
    this.attrs[name] = value;
    return this;
  };

  this.get = function(name) {
    return this.attrs[name];
  };

};


// query, options: (optional)
// callback(docs)
Book.find = function(query, options, callback) {
  if (callback === undefined) callback = options;
  if (options  === undefined) callback = query;
  getDb(function(db) {
    var books = db.collection('books').find(
      {},
      {title: true, cover_img: true, open_count: true, book_page_url: true}
    );
    books.sort({open_count: -1});
    books.toArray(function(err, docs) {
      if (err) throw err;
      else callback(docs);
    });
  });
};


module.exports = Book;
