'use strict';


var app = angular.module('comicApp', ['ngRoute', 'ngAnimate']);


app.config(function($routeProvider, $locationProvider) {

  $routeProvider.when('/', {
    controllerAs: 'DashboardCtrl',
    controller:   'DashboardCtrl',
    templateUrl:  'dashboard.html',
    resolve: {
      initResolver: 'initResolver'
    }
  })
  .when('/:book_title/', {
    controllerAs: 'BookCtrl',
    controller:   'BookCtrl',
    templateUrl:  'book.html',
    resolve: {
      initResolver: 'initResolver'
    }
  })
  .when('/:book_title/:chapter_title/', {
    controllerAs: 'ChapterCtrl',
    controller:   'ChapterCtrl',
    templateUrl:  'chapter.html',
    resolve: {
      initResolver: 'initResolver'
    }
  })
  .otherwise({
    redirectTo: '/'
  });

  $locationProvider.html5Mode(true);

});


app.factory('initResolver', function($q, $timeout, $location) {
  var deferred = $q.defer();
  $location.path('/');
  deferred.resolve();
  return deferred.promise;
});


app.factory('getResources', function($http) {

  // callback(type, object)
  return function(url, callback) {
    // unseal stone url
    // http://www.u17.com/comic/6066.html?u=1511242
    NProgress.start();
    if (/^http:\/\/www\.u17\.com\/comic\/\d+\.html\?u=\d+$/.test(url)) {
      return $http.post('/api/get_unseal_stone', {reference_url: url})
      .then(function(res) {
        NProgress.done();
      });
    }
    // other pages
    else {
      return $http.post('/api/scrap_url', {target_url: url})
      .then(
        function(res) {
          NProgress.done();
          return res.data.type === 'chapter_page' ?
                 {type: 'chapter_page', data: res.data.urls} :
                 {type: 'book_page'   , data: res.data.chapters};
        },
        function(err) {
          NProgress.remove();
          throw err;
        }
      );
    }
  };

});


app.controller('AppCtrl', function($scope, $http, $location, getResources) {

  $scope.inputSubmit = function($event, targetUrl) {
    var valid = $event.keyCode == null ?
                true :
                ($event.keyCode === 13 && $scope.headerForm.$valid);

    if (valid) {
      getResources(targetUrl).then(
        function(res) {
          if (res == null) alert('Success');
          else if (res.type === 'chapter_page') {
            $scope.urls = res.data;
            $location.path('/book_page/chapter_page');
          }
          else {
            $scope.chapters = res.data;
            $location.path('/book_page');
          }
        },
        function(err) { alert(err); }
      );
    }
  };

});


app.controller('DashboardCtrl', function($scope, $http) {

  var _this = this;

  // Query all Books at the beginning
  $http.get('/api/books').success(function(books) {
    _this.books = books;
  });

});


app.controller('BookCtrl', function($scope, $location, getResources, $routeParams) {

  this.jumpToChapter = function(chapter, $index) {
    getResources(chapter.href)
    .then(
      function(res) {
        var $parent = $scope.$parent;
        $parent.urls = res.data;
        $parent.lastVisitedChapterIndex = $index;
        $location.path('/book_page/chapter_page');
      },
      function(err) { alert(err); }
    );
  };

  this.chapters = $scope.chapters;
});


app.controller('ChapterCtrl', function($scope) {
  this.images = $scope.urls;
});
