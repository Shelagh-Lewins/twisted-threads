Template.home.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('patterns_in_row', Meteor.my_functions.patterns_in_row());
}

// Subsidiary 'home' pages
Template.recent_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('patterns_in_row', Meteor.my_functions.patterns_in_row());
}

Template.new_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('patterns_in_row', Meteor.my_functions.patterns_in_row());
}

Template.my_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('patterns_in_row', Meteor.my_functions.patterns_in_row());
}

Template.all_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('patterns_in_row', Meteor.my_functions.patterns_in_row());
}

// *** create_new_pattern *** //
Template.create_new_pattern.events({
  'submit form': function(event){
    event.preventDefault();

    var number_of_tablets = $('#num_tablets').val();
    var number_of_rows = $('#num_rows').val();
    var pattern_name = $('#pattern_name').val();

    Meteor.my_functions.new_pattern(pattern_name, number_of_tablets, number_of_rows);

    $('[name=pattern_name]').val(''); // reset pattern name
    // however do not reset numbers, in case user wants to create another similar pattern?
  }
});

Template.home_patterns.helpers({
  header_width: function() {
    var number = Session.get('patterns_in_row');
    return (number * Meteor.my_params.pattern_thumbnail_width) + ((number - 1) * Meteor.my_params.pattern_thumbnail_rmargin);
  }
});

/* *** Individual pattern in list *** */
Template.pattern_thumbnail.helpers({
  width: function() {
    return Meteor.my_params.pattern_thumbnail_width + "px";
  },
  rmargin: function() {
    return Meteor.my_params.pattern_thumbnail_rmargin + "px";
  },
  created_by_current_user: function () {
    return this.created_by === Meteor.userId();
  }
});

Template.pattern_thumbnail.events({
// Delete pattern
  'click #delete': function(event) {
    event.preventDefault();
    var name = Patterns.findOne({ _id: this._id}).name;
    var pattern_id = this._id;

    var r = confirm(name + "\nDo you want to delete this pattern?");
    if (r == true)
    {
      Meteor.call('remove_pattern', pattern_id);
    }
  },
  "click #toggle_private": function (event) {
    event.preventDefault();
    Meteor.call("set_private", this._id, !this.private);
  }
});


