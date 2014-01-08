app.animation('.md-view', function($rootScope) {

  var currentLevel = 1
    , previousLevel = 0;

  $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
    currentLevel = current.$$route.level;
    previousLevel = previous.$$route.level;
  });

  return {
    enter: function(element, done) {
      if (currentLevel - previousLevel > 0) {
        element.children().css({zIndex: 1});
        TweenLite.from(element.children(), 0.6, {left: '100%', onComplete: done});
      } else {
        element.children().css({zIndex: -1});
        TweenLite.from(element.children(), 0.6, {scale: 0.75, onComplete: done});
      }
    },

    leave: function(element, done) {
      if (currentLevel - previousLevel > 0) {
        element.children().css({zIndex: -1});
        TweenLite.to(element.children(), 0.6, {scale: 0.75, onComplete: done});
      } else {
        element.children().css({zIndex: 1});
        TweenLite.to(element.children(), 0.6, {left: '100%', onComplete: done});
      }
    }
  };

});
