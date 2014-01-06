'use strict';


var getDb = require('../helpers/getDb')
  , ObjectID = require('mongodb').ObjectID
  , Q = require('q')
  , debug = require('util').debug;


var Book = function(attrs) {

  var _this = this;

  this.attrs = attrs || {};

  this.save = function() {
    var saved = Q.defer();
    getDb(function(db) {
      var books = db.collection('books');
      books.findAndModify(
        { title: _this.attrs.title },
        'title',
        { $set: _this.attrs, $setOnInsert: {open_count: 0} },
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

  this.inc = function(name) {
    var incremented = Q.defer();
    if (this.get('_id') == null) {
      incremented.reject('No `_id` specified.');
    } else {
      getDb(function(db) {
        var books = db.collection('books');
        var $inc = {};
        $inc[name] = 1;
        books.findAndModify(
          { _id: _this.get('_id') },
          '_id',
          { $inc: $inc },
          { 'new': true },
          function(err, doc) {
            if (err) throw err;
            _this.attrs[name]++;
            incremented.resolve(_this);
          }
        );
      });
    }
    return incremented.promise;
  };

  if (typeof this.get('_id') === 'string') {
    this.set( '_id', new ObjectID(this.get('_id')) );
  }

};


// query, options: (optional)
// callback(docs)
Book.find = function(query, options, callback) {

  if (typeof query === 'function') {
    callback = query;
    query = options = {};
  } else {
    if (typeof query._id === 'string') {
      query._id = new ObjectID(query._id);
    }
  }

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  getDb(function(db) {
    var books = db.collection('books').find(
      query,
      {title: true, cover_img: true, open_count: true, book_page_url: true}
    );
    books.sort({open_count: -1});
    books.toArray(function(err, docs) {
      if (err) throw err;
      if (query._id) callback( new Book(docs[0]) );
      else callback(docs);
    });
  });

};


module.exports = Book;
