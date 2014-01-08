app.animation('.md-view', function($rootScope) {

  var currentLevel = 1
    , previousLevel = 0;

  $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
    console.log(arguments);
    currentLevel = current.$$route.level;
    previousLevel = previous.$$route.level;
  });

  return {
    enter: function(element, done) {
      console.log(currentLevel, previousLevel);
      if (currentLevel - previousLevel > 0) {
        element.children()
          .css({left: '100%', zIndex: 1})
          .animate({left: 0}, 600, function() {
            $(this).css({left: '', zIndex: ''})
            done();
          });
      } else {
        setTimeout(done, 600);
      }
    },

    leave: function(element, done) {
      console.log(currentLevel, previousLevel);
      if (currentLevel - previousLevel > 0) {
        setTimeout(done, 600);
      } else {
        element.children()
          .css({left: 0, zIndex: 1})
          .animate({left: '100%'}, 600, function() {
            $(this).css({left: '', zIndex: ''})
            done();
          });
      }
    }
  };

});
