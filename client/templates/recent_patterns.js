Template.recent_patterns.rendered = function() {
  Session.set('recent_patterns_count', 0);
}

Template.recent_patterns.created = function() {
  params = {
    pattern_ids: Meteor.my_functions.get_recent_pattern_ids(),
  };

  this.subscribe('recent_patterns', params, {
    onReady: function() {
      Session.set('recent_patterns_count', Patterns.find(
        { _id: {$in: params.pattern_ids} },
        { fields: {_id: 1}},
      ).count());
    }
  });
};

Template.recent_patterns.helpers({
  'recent_patterns': function(){
    var  pattern_ids = Meteor.my_functions.get_recent_pattern_ids();

    // return patterns in the original array order
    var sorted_patterns = Patterns.find(
        {_id: {$in:pattern_ids}}
      ).fetch().sort((a,b) => {
      return pattern_ids.indexOf(a._id) === pattern_ids.indexOf(b._id) ? 0 : (pattern_ids.indexOf(a._id) < pattern_ids.indexOf(b._id) ? -1 : 1);
    });

    return sorted_patterns;
  }
});