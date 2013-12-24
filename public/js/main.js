'use strict';


var app = angular.module('comicApp', ['ngRoute', 'ngAnimate']);

app.config(function($routeProvider, $locationProvider) {

  $routeProvider.when('/', {
    controllerAs: 'DashboardCtrl',
    controller:   'DashboardCtrl',
    templateUrl:  'dashboard.html'
  })
  .when('/:book_title/', {
    controllerAs: 'BookCtrl',
    controller:   'BookCtrl',
    templateUrl:  'book.html',
    resolve: {
      gotBook: function(DataObject, $q, $location) {
        var gotBook = $q.defer();
        if ('chapters' in DataObject) {
          gotBook.resolve();
        } else {
          $location.path('/');
          gotBook.reject();
        }
        return gotBook.promise;
      }
    }
  })
  .when('/:book_title/:chapter_title/', {
    controllerAs: 'ChapterCtrl',
    controller:   'ChapterCtrl',
    templateUrl:  'chapter.html',
    resolve: {
      gotChapter: function(DataObject, $q, $location) {
        var gotBook = $q.defer();
        if ('urls' in DataObject) {
          gotBook.resolve();
        } else {
          $location.path('/');
          gotBook.reject();
        }
        return gotBook.promise;
      }
    }
  })
  .otherwise({
    redirectTo: '/'
  });

  $locationProvider.html5Mode(true);

});


app.run(function($rootScope, $http, $location, DataObject) {

  $rootScope.inputSubmit = function($event, targetUrl) {
    if ($event.keyCode === 13 && $rootScope.headerForm.$valid) {
      $http.post('/api/scrap_url', {target_url: $rootScope.targetUrl})
      .then(function(res) {
        if (res.data.type === 'chapter_page') {
          DataObject.urls = res.data.urls;
          $location.path('/book_page/chapter_page/');
        } else {
          DataObject.chapters = res.data.chapters;
          $location.path('/book_page/');
        }
      }, function(err) {
        console.error('Error occurs during scraping %O', err.data);
      });
    }
  };

});


app.controller('DashboardCtrl', function($scope) {

});


app.controller('BookCtrl', function($scope, DataObject, $location, $http, $rootScope) {

  this.jumpToChapter = function(chapter, $index) {
    $http.post('/api/scrap_url', {target_url: chapter.href})
    .then(function(res) {
      if (res.data.type === 'chapter_page') {
        DataObject.urls = res.data.urls;
        $rootScope.lastVisitedChapterIndex = $index;
        $location.path($location.path() + chapter.title);
      }
    }, function(err) {
      console.error('Error occurs during scraping %O', err.data);
    });
  };

  var _this = this;
  $scope.$watch(function() {
    return DataObject.chapters;
  }, function(val) {
    _this.chapters = val;
  });
});


app.controller('ChapterCtrl', function($scope, DataObject) {
  var _this = this;
  $scope.$watch(function() {
    return DataObject.urls;
  }, function(val) {
    _this.images = val;
  });
});


app.value('DataObject', {});
