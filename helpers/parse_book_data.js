'use strict';

var cheerio = require('cheerio');


module.exports = function(content) {

  var $ = cheerio.load(content);

  // Get details
  var _workinfo = $('#workinfo');
  var cover_img = _workinfo.find('.cover img').attr('src');
  var book_title = _workinfo.children('h1').contents()[0].data.trim();

  // Get chapter
  var match = /<ul\s.*id="chapter">([\s\S]+?)<\/ul>/.exec(content);
  if (!match) return false;

  var items = match[1].match(/<a.+?>.+?<\/a>/g);
  var chapters = [];
  for (var i = 0; i < items.length; i++) {
    var href = /href="(.+?)"/i.exec(items[i]);
    var title = /title="(.+?)"/i.exec(items[i]);
    if (href && title) {
      chapters.push({href: href[1], title: title[1]});
    }
  }

  return {title: book_title, cover_img: cover_img, chapters: chapters};

};
