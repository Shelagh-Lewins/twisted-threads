Template.user.rendered = function() {
  $('body').attr("class", "user");
  Meteor.my_functions.initialize_route();
}

Template.user_not_found.helpers({
  'id': function(){
    return Router.current().params._id;
  }
});

Template.user.helpers({
  user_patterns: function(user_id){
    return Patterns.find({ created_by: user_id});
  },
  user_patterns_exist: function() {
    // indicate whether this user has any patterns
    if (Patterns.find().count() != 0)
        return true;
  }
});

