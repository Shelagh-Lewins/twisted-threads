Template.print_pattern.rendered = function() {
  $('body').attr("class", "print");
  Meteor.subscribe('user_info');
}

Template.print_pattern.onCreated(function(){
  var pattern_id = Router.current().params._id;
  Meteor.my_functions.build_pattern_display_data(pattern_id);
});

Template.print_pattern.helpers({
  hostname: function(){
    return location.hostname;
  },
  created_by: function(){
    var pattern_id = Router.current().params._id;
    if (typeof pattern === "undefined")
        return;

    var created_by_id = Patterns.findOne({ _id: pattern_id}, {fields: {created_by: 1 }}).created_by;
    return Meteor.users.findOne({ _id: created_by_id}).username;
  }
});

Template.print_pattern.events({
    'click #print_hint .close': function() {
      $('#print_hint').removeClass("visible");
    }
  });


