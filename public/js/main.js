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
  .when('/:book_id', {
    controllerAs: 'BookCtrl',
    controller:   'BookCtrl',
    templateUrl:  'book.html',
    resolve: {
      initResolver: 'initResolver'
    }
  })
  .when('/:book_id/:chapter_index', {
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
  $timeout(function() { deferred.resolve(); });
  return deferred.promise;
});


app.value('isMobile', function() {
  var a = navigator.userAgent || navigator.vendor || window.opera;
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
  return true;
  else return false;
});


app.run(function(isMobile) {
  if (isMobile()) {
    $(document.body).addClass('ly-mobile');
  }
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
                 {type: 'chapter_page', urls: res.data.urls} :
                 res.data;
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
        function(data) {
          if (data == null) alert('Success');
          else if (data.type === 'chapter_page') {
            $scope.urls = data.urls;
            $location.path('/book_page/chapter_page');
          }
          else {
            $scope.chapters = data.chapters;
            $location.path('/'+data._id);
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


app.controller('BookCtrl', function($scope, $location, getResources, $routeParams, $http, $timeout) {

  this.jumpToChapter = function(chapter, $index) {
    getResources(chapter.href)
    .then(
      function(data) {
        var $parent = $scope.$parent;
        $parent.urls = data.urls;
        $parent.lastVisitedChapterIndex = $index;
        $location.path( $location.path() + '/chapter_page' );
      },
      function(err) { alert(err); }
    );
  };

  $http.put('/api/books/' + $routeParams.book_id, {open_count: '$inc'});

  this.chapters = $scope.chapters;

});


app.controller('ChapterCtrl', function($scope) {
  this.images = $scope.urls;
});


app.directive('mdBookshelfLayout', function($window) {
  return function(scope, element, attrs) {

    var placeholderClass = attrs.mdBookshelfLayout;

    // Adjust the width of remainder items, in order to align them
    //
    scope.$watch(adjustRemainderItemLayout);
    $($window).on('resize', adjustRemainderItemLayout);

    function adjustRemainderItemLayout() {
      var pw = element.outerWidth()
        , ph = element.outerHeight();
      var $children = element.children(':not(.'+placeholderClass+')');
      var cw = $children.outerWidth()
        , ch = $children.outerHeight();

      if (ph > ch) { // Multiple line
        var itemsPerLine = Math.round(pw / cw);
        var remainder = $children.length % itemsPerLine;
        var remainder = remainder || itemsPerLine;
        var $placeholders = element.find('.'+placeholderClass);
        console.log(itemsPerLine, remainder);
        if ($placeholders.length != itemsPerLine - remainder) {
          $placeholders.remove();
          for (var i = 0; i < itemsPerLine - remainder; i++) {
            element.append($('<li>').addClass(placeholderClass));
          }
        }
      } else {
        element.find('.'+placeholderClass).remove();
      }
    }

  };
});


app.directive('mdBookshelfItemBackground', function() {
  return function(scope, element, attrs) {

    setTimeout(function() {
      var img = element.find('.md-bookshelf-item-image')[0];
      RGBaster.colors(img, function(payload) {
        element.css('background-color', payload.dominant);
      });
    }, 10);

    element.on('mouseenter', 'a', function() {
      element.css('opacity', .7);
    });

    element.on('mouseleave', 'a', function() {
      element.css('opacity', '');
    });

  };
});
