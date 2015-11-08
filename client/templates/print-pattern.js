Template.print_pattern.rendered = function() {
  $('body').attr("class", "print");
  //Meteor.my_functions.initialize_weave();
  //Meteor.my_functions.initialize_route();
  var pattern_id = Router.current().params._id;
  var created_by_id = Patterns.findOne({ _id: pattern_id}).created_by;
  Meteor.subscribe('user_info', created_by_id);
}

Template.print_pattern.helpers({
  hostname: function(){
    return location.hostname;
  },
  created_by: function(){
    var pattern_id = Router.current().params._id;
    var created_by_id = Patterns.findOne({ _id: pattern_id}).created_by;
    return Meteor.users.findOne({ _id: created_by_id}).username;
  }
});


