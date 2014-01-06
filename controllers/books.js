var Book = require('../models/book');


module.exports = function(app) {

  app.get(    '/api/books'    , getAll);
  app.get(    '/api/books/:id', getBook);
  app.post(   '/api/books'    , createBook);
  app.put(    '/api/books/:id', updateBook);
  app.delete( '/api/books/:id', removeBook);

};


function getAll(req, res, next) {
  Book.find(function(books) {
    res.json(books);
  });
}


function getBook(req, res, next) {

}


function createBook(req, res, next) {

}


function updateBook(req, res, next) {

}


function removeBook(req, res, next) {

}
