Template.home.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
}

// Subsidiary 'home' pages
Template.recent_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
}

Template.new_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
}

Template.my_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
}

Template.all_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
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
    var number = Session.get('thumbnails_in_row');
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
  },
  preview_url: function () {
    var pattern_id = this._id;
    var preview_url = "../images/default_pattern_thumbnail.png";

    if (Images.find({used_by:pattern_id, role:"preview"}).count() > 0)
      var preview_url = Images.findOne({used_by:pattern_id, role:"preview"}).url;

    return preview_url;
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

/* *** Individual user in list *** */
Template.user_thumbnail.helpers({
  width: function() {
    return Meteor.my_params.pattern_thumbnail_width + "px";
  },
  rmargin: function() {
    return Meteor.my_params.pattern_thumbnail_rmargin + "px";
  },
  thumbnail_url: function() {
    return "../images/default_user_thumbnail.png";
  },
  background: function(_id) {
    // quick way to give users different coloured backgrounds, until there are proper user profiles
    var num =_id.charCodeAt(0);

    if (num < 55)
      return "#FFFFCC";

    else if (num < 75)
      return "#99FFCC";

    else if (num < 90)
      return "#CC99CC";

    else if (num < 105)
      return "#99CCFF";

    else
      return "#CC9900";
  },
  number_of_patterns: function() {
    var num = Patterns.find({
    $and: [
      { private: {$ne: true} },
      { created_by: this._id }
    ]}).count();
    
    return num;
  }
});

Template.filter_on_tablets.helpers({
  min_tablets: function() {
    var min = parseInt(Session.get('display_min_tablets'));
      return min;
  },
  max_tablets: function() {
    var max = parseInt(Session.get('display_max_tablets'));
      return max;
  }
});

Template.filter_on_tablets.events({
  'change #min_tablets': function(event) {
    event.preventDefault();
    var min = parseInt(event.target.value);
    var max = parseInt(Session.get('display_max_tablets'));

    if (!isNaN(min) || (min == ""))
    {
      if (max <= min)
        min = max - 1;

      if (min < 1)
        min = 1;
    }
    else
    {
      // setting filter min to undefined doesn't work, must use a number
      min = 1;
    }
    Session.set('display_min_tablets', min);
    event.target.value = min; // session var may not have changed, e.g. if user entered 0, then -1. So force the input to display the right value.
  },
  'change #max_tablets': function(event) {
    event.preventDefault();
    var min = parseInt(Session.get('display_min_tablets'));
    var max = parseInt(event.target.value);

    if (!isNaN(max))
    {
      if (max <= min)
        max = 500;
        

      if (max < 1)
          max = 500;
    }
    else
    {
      // setting filter max to undefined doesn't work, must use a number
      max = 500;
    }
    Session.set('display_max_tablets', max);
    event.target.value = max; // session var may not have changed, e.g. if user entered 0, then -1. So force the input to display the right value
  }
});


