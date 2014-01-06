'use strict';


var MongoClient = require('mongodb').MongoClient
  , emitter = new (require("events").EventEmitter);


var db;

MongoClient.connect('mongodb://127.0.0.1:27017/u17Reader', function(err, _db) {
  if(err) throw err;
  db = _db;
  emitter.emit('ready', db);
});


module.exports = function(callback) {
  if (db) callback(db);
  else emitter.once('ready', callback);
}
