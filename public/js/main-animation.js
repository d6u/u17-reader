app.animation('.md-view', function($rootScope) {

  var currentLevel, priorLevel;

  $rootScope.$on('$routeChangeSuccess', function(event, current, prior) {
    currentLevel = current.$$route.level;
    priorLevel = prior.$$route.level;
  });

  return {
    enter: function(element, done) {
      if (typeof currentLevel === 'undefined') {
        done();
        return;
      }
      if (currentLevel - priorLevel > 0) {
        element.removeClass('lower-level').addClass('higher-level');
      } else {
        element.removeClass('higher-level').addClass('lower-level');
      }
      done();
    },

    leave: function(element, done) {
      if (currentLevel - priorLevel > 0) {
        element.removeClass('higher-level').addClass('lower-level');
      } else {
        element.removeClass('lower-level').addClass('higher-level');
      }
      done();
    }
  };

});
