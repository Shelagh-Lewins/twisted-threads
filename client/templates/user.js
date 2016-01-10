Template.user.rendered = function() {
  $('body').attr("class", "user");
  Meteor.my_functions.initialize_route();

  // configure pagination
  var filter = jQuery.extend({}, AllPatterns.filters);
  var user_id = Router.current().params._id;
  var filter = jQuery.extend({}, UserPatterns.filters);
  //console.log("test " + user_id);

  UserPatterns.set({
    //filters: Meteor.my_functions.set_tablets_filter(filter, min, max)
    filters: Meteor.my_functions.set_created_by_filter(filter, user_id)
  });
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
    // show the description if either the user can edit it, or there is a description defined
    var user = Meteor.users.findOne({_id: user_id});

    if (typeof user === "undefined")
      return false;

    // if it's your own page you can add a description
    if (user_id == Meteor.userId())
      return true;

    // if it's another user's page, only show description if profile is defined and description is a non-empty string
    else if (typeof user.profile !== "undefined")
    {
      description = user.profile.description;

      if ((description != "") && (typeof description !== "undefined"))
        return true;
    }
  }
});

