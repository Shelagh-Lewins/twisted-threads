Template.home.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());

  /* currently, there is a button per edit mode. But the code is in place so you can select a mode and then press a single button. */
  Session.set('edit_mode', 'simulation');

  var params = {
    limit: Session.get('thumbnails_in_row')
  }; 

  /* this.subscribe('patterns', {
    onReady: function () { 
      Session.set('patterns_ready', true);

      Meteor.subscribe('user_info', params, {
        onReady: function() {
          Session.set('user_info_ready', true);
        }
      });
    }
  }); */

  this.subscribe('recent_patterns', params, {
    onReady: function() {
      Session.set('recents_ready', true);
    }
  });
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

Template.create_new_pattern.events({
  "click input[type=submit]": function(event){""
    event.preventDefault();
    var edit_mode = event.currentTarget.name;
    var number_of_rows = "0";
    if(edit_mode != "simulation")
      number_of_rows = $('#num_rows').val();

    var params = {
      edit_mode: edit_mode, // two submit buttons, simulation and freehand
      number_of_tablets: $('#num_tablets').val(),
      number_of_rows: number_of_rows, // only actually used by freehand patterns
      name: $('#pattern_name').val()
    }

    Meteor.my_functions.new_pattern(params);

    $('[name=pattern_name]').val(''); // reset pattern name
    // however do not reset numbers, in case user wants to create another similar pattern?
  }
});

Template.create_new_pattern.helpers({
  header_width: function() {
    var number = Session.get('thumbnails_in_row');
    return (number * Meteor.my_params.pattern_thumbnail_width) + ((number - 1) * Meteor.my_params.pattern_thumbnail_rmargin);
  },
  is_selected_edit_mode: function(mode) {
    if (Session.get("edit_mode") == mode)
      return "selected";
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
  use_auto_preview: function() {
    return true; // TODO see if the user has selected a different image
  },
  auto_preview_svg: function() {
    var data = this.auto_preview;
    //console.log("data " + data);
    var src = 'data:image/svg+xml;base64,' + window.btoa(data);
    return src;
  },
  auto_preview_rotation: function() {

    switch(this.preview_rotation)
    {
      case "left":
        return "left";
        break;

      case "up":
        return "up";
        break;

      case "right":
        return "right";
        break;

      case "down":
        return "down";
        break;

      default:
        return "right";
    }
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
  'click .delete': function(event) {
    event.preventDefault();
    var pattern_id = this._id;

    Meteor.my_functions.delete_pattern(pattern_id);
  },
  "click .toggle_private": function (event) {
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
    return Meteor.users.findOne({_id: this._id}).profile.public_patterns_count;
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
  },
  "click #reload_pages": function() {
    // this is a workaround for pagination not reloading reliably when filters are changed. If a better fix is found, the 'reload' button should be removed.
    // https://github.com/alethes/meteor-pages/issues/228
    switch(Router.current().route.getName())
    {
      case "my_patterns":
        MyPatterns.reload();
        break;

      case "all_patterns":
        AllPatterns.reload();
        break;

      case "new_patterns":
        NewPatterns.reload();
        break;

      case "user":
        UserPatterns.reload();
        break;
    }
  }
});


