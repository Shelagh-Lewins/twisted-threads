Template.home.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());

  /* currently, there is a button per edit mode. But the code is in place so you can select a mode and then press a single button. */
  Session.set('edit_mode', 'simulation');

  Session.set('recent_patterns_count', 0);
}

// Short lists of first few patterns / users within each category, displayed on Home page
// left column and recent patterns list each have to subscribe to recent patterns
// Left column menu
Template.left_column.created = function() {
  params = {
    pattern_ids: Meteor.my_functions.get_recent_pattern_ids(),
  };

  this.subscribe('recent_patterns', params, {
    onReady: function() {
      Session.set('recent_patterns_count', Patterns.find(
        { _id: {$in: params.pattern_ids} },
        { fields: {_id: 1}},
      ).count());
      Meteor.my_functions.maintain_recent_patterns(); // clean up the recent patterns list in case any has been changed
    }
  });
};

// Recent Patterns
Template.recent_patterns_home.created = function() {
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

// Recent Patterns are limited in number and not paginated.
Template.recent_patterns_home.helpers({
  'recent_patterns_home': function(){
    var  pattern_ids = Meteor.my_functions.get_recent_pattern_ids();

    // return patterns in the original array order
    var sorted_patterns = Patterns.find(
        {_id: {$in:pattern_ids}}
      ).fetch().sort((a,b) => {
      return pattern_ids.indexOf(a._id) === pattern_ids.indexOf(b._id) ? 0 : (pattern_ids.indexOf(a._id) < pattern_ids.indexOf(b._id) ? -1 : 1);
    });

    return sorted_patterns.slice(0, Session.get('thumbnails_in_row'));
  }
});

// New Patterns preview
Template.new_patterns_home.created = function() {
  this.subscribe('new_patterns');
};

Template.new_patterns_home.helpers({
  'new_patterns_home': function(){
    return Patterns.find(
      {
        $or: [
          { private: {$ne: true} },
          { created_by: Meteor.userId() }
        ]
      },
      {
        limit: Meteor.my_params.max_recents,
        sort: {created_at: -1},
      }
    );
  }
});

// My Patterns preview
Template.my_patterns_home.created = function() {
  this.subscribe('my_patterns');
};

Template.my_patterns_home.helpers({
  'my_patterns_home': function(){
    return Patterns.find(
      { created_by: Meteor.userId() },
      {
        limit: Session.get('thumbnails_in_row'),
        sort: {name_sort: 1},
      }
    );
  }
});

// All Patterns preview
Template.all_patterns_home.created = function() {
  this.subscribe('all_patterns');
};

Template.all_patterns_home.helpers({
  'all_patterns_home': function(){
    return Patterns.find(
      {
        $or: [
          { private: {$ne: true} },
          { created_by: Meteor.userId() },
        ]
      },
      {
        limit: Session.get('thumbnails_in_row'),
        sort: {name_sort: 1},
      }
    );
  }
});

// Users preview
Template.users_home.created = function() {
  this.subscribe('users_home');
};

Template.users_home.helpers({
  'users_home': function(){
    var obj = {
      'sort': { 'profile.name_sort': 1 },
      'limit': Session.get('thumbnails_in_row')
    }

    return Meteor.users.find({}, obj);
  }
});

// Subsidiary 'home' pages. Paginated.
// Recent Patterns page
Template.recent_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
  Session.set('recent_patterns_count', 0);
};

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

// New Patterns page
Template.new_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
};

// My Patterns page
Template.my_patterns.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
};

// All Patterns page
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

Template.left_column.helpers({
  recent_patterns_count: function() {
    return Session.get('recent_patterns_count');
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
    var user = Meteor.users.findOne({_id: this._id});
    var number_of_patterns = user.profile.public_patterns_count;

    if (typeof number_of_patterns === "undefined")
      number_of_patterns = 0;

    return number_of_patterns;
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


