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
  user_patterns_exist: function(user_id) {
    // indicate whether this user has any patterns
    if (Patterns.find({created_by: user_id}).count() != 0)
      return true;
  },
  show_description: function(user_id){
    // show the profile if either the user can edit it, or there is a profile defined
    var profile = Meteor.users.findOne({_id: user_id}).profile;
    description = profile.description;

    if ((description != "") || user_id == Meteor.userId())
      return true;
  }
});

