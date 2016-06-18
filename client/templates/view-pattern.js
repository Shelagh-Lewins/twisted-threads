Template.view_pattern.rendered = function() {
  $('body').attr("class", "view_pattern");
  var pattern_id = Router.current().params._id;
  Meteor.my_functions.add_to_recent_patterns(pattern_id);
  Meteor.my_functions.view_pattern_render(pattern_id);
  Meteor.my_functions.initialize_route();

  Session.set('show_image_uploader', false);
  Session.set('upload_status', 'not started');
  Session.set('edited_pattern', false);

  /////////
  // collectionFS image MAY NOT NEED THIS AS NOT SCROLLING PICTURES
  // but nice reference for infinite scroll
  /*var self = this;
  // is triggered every time we scroll
  $(window).scroll(function() {
    if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
      incrementLimit(self);
    }
  });*/
}

Template.view_pattern.onCreated(function(){
  var pattern_id = Router.current().params._id;
  Meteor.my_functions.view_pattern_created(pattern_id);

  /////////
  // Images
  Tracker.autorun(function() {
    Meteor.subscribe('images');
  });

  if (Router.current().params.mode == "full")
    Session.set('view_full_pattern', true);
  else
    Session.set('view_full_pattern', false);
});

Template.pattern_not_found.helpers({
  'id': function(){
    return Router.current().params._id;
  }
});

Template.remove_row.helpers({
  can_remove_rows: function() {
    // is there more than 1 row?
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_rows: 1}});

    if (typeof pattern === "undefined") // avoids error when pattern is private and user doesn't have permission to see it
        return;

    if (pattern.number_of_rows > 1) {
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
    }
  }
});

Template.view_pattern.helpers({
  /////////////////////
  // pattern
  view_full_pattern: function() {
    if (Session.equals('view_full_pattern', true))
      return true;

    else
      return false;
  },
  can_remove_tablets: function() {
    // is there more than 1 tablet?
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_tablets: 1}});

    if (typeof pattern === "undefined") // avoids error when pattern is private and user doesn't have permission to see it
        return;

    if (pattern.number_of_tablets > 1)
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
  },
  undo_disabled: function() {
    var position = parseInt(Session.get('undo_stack_position')) - 1;

    if (position < 0)
      return "disabled";
  },
  redo_disabled: function() {
    var position = parseInt(Session.get('undo_stack_position'))+1;

    if (position >= stored_patterns.length)
      return "disabled";
  },
  hole_handedness: function() {
    // are the tablet holes labelled clockwise or anticlockwise?
    // default is clockwise if not otherwise specified
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { hole_handedness: 1}});

    if (typeof pattern === "undefined") // avoids error when pattern is private and user doesn't have permission to see it
        return;

    if (pattern.hole_handedness == "anticlockwise")
      return "anticlockwise";

    else
      return "clockwise";
  },
  //////////////////////////
  // Image uploads
  'show_image_uploader': function() {
    if (Session.equals('show_image_uploader', true))
      return true;
  },
  'image_limit_reached': function() {
    var pattern_id = Router.current().params._id;

    var max_images = Meteor.settings.public.max_images_per_pattern.verified;

    if (Roles.userIsInRole( Meteor.userId(), 'premium', 'users' ))
      max_images = Meteor.settings.public.max_images_per_pattern.premium;
    
    if (Images.find({ used_by: pattern_id }).count() >= max_images)
      return true;

    else
      return false;
  },
  // pattern preview, if any
  'pattern_preview': function() {
    var pattern_id = Router.current().params._id;
    return Images.find({$and: [
      { used_by: pattern_id },
      { role: "preview"}]
    });
  },
  // other pattern images, if any
  'pattern_image': function() {
    var pattern_id = Router.current().params._id;
    return Images.find({$and: [
      { used_by: pattern_id },
      { role: "image"}]
    });
  }
});

Template.orientation.helpers({
  'tablet_orientation': function()
  {
    if (typeof current_orientation !== "undefined")
      return current_orientation.list();   
  },
  'style_orientation': function(orientation) {
    if (orientation == "Z")
        return "orientation_z";

    else
        return "orientation_s";
  }
});

Template.styles_palette.onRendered(function(){
  var pattern_id = Router.current().params._id;

  // avoids error when pattern is private and user doesn't have permission to see it

  if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;
  Meteor.my_functions.initialize_weft_color_picker();
  Meteor.my_functions.initialize_warp_color_picker();
  Meteor.my_functions.initialize_background_color_picker();

  // correctly position the Edit Style panel
  var panel = $('#styles_palette .edit_style')[0];

  var offset = $('#styles_palette').outerHeight(true);
  panel.style.bottom = offset + "px";
  Meteor.my_functions.resize_page();
});

Template.styles_palette.helpers({
  editing_style: function() {
    if (Session.equals('edit_style', true))
        return "editing";
  },
  editing_text: function(){ // on small screens, the styles palette interferes with text editing
    if (Session.equals('editing_text', true))
    {
      return "editing_text";
    }
  },
  single_column: function() {
    if (Session.get('window_width') < 724)
        return true;

    else
        return false;
  },
  styles: function(page) {
    //var pattern_id = Router.current().params._id;

    var styles_array = [];
    if (typeof page === "undefined")
    {
      for (var i=0; i<current_styles.length; i++)
      {
        styles_array.push({style: i+1});
      }
    }
    else
    {
      var number_per_page = 16;
      var lower = (page - 1) * number_per_page;
      
      for (var i=0; i<number_per_page; i++)
      {
        styles_array.push({style: lower+i+1});
      }
    }

    return styles_array;
  },
  style_pages: function() {
    // display styles in pages. Currently 32 styles are shown in 2 pages.
    return [1, 2];
  },
  style_page_class: function() {
    switch(Session.get('styles_palette'))
    {
      case "styles_1":
        if (Session.get('window_width') >= 724)
        {
          Session.set('styles_palette', 'all_styles');
          return "all_styles";
        }
        else
        {
          return "styles_1";
        }

      case "styles_2":
        if (Session.get('window_width') >= 724)
        {
          Session.set('styles_palette', 'all_styles');
          return "all_styles";
        }
        else
        {
          return "styles_2";
        }

      case "all_styles":
        if (Session.get('window_width') < 724)
        {
          Session.set('styles_palette', 'styles_1');
          return "styles_1";
        }
        else
        {
          return "all_styles";
        };

      case "special":
        return "special";
    }
  },
  is_selected_style_palette: function(page) {
    if (Session.equals('styles_palette', page))
        return "selected";
  },
  special_styles: function(){

    var special_styles_array = [];
    for (var i=0; i<current_special_styles.length; i++)
    {
      special_styles_array.push({style: current_special_styles[i].style});
    }

    return special_styles_array;
  },
  show_special_styles: function(){
    if (Session.equals('show_special_styles', true))
      return "show_special_styles";
  },
  warp: function() {
    var selected_style = Session.get("selected_style");

    if (typeof selected_style === "undefined") // can be undefined at startup
        return;

    var pattern_id = Router.current().params._id;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;

    var style = current_styles.list()[selected_style-1];

    if (typeof style === "undefined")
        return;

    return style.warp;
  },
  edit_style_warp: function(current_warp) {
    //console.log("warp " + current_warp);
    var warps = [
      {
        new_warp: "forward",
        symbol: "#forward_warp_symbol",
        title: "Forward sloping warp thread",
        selected_stroke: "#000000"
      },
      {
        new_warp: "backward",
        symbol: "#backward_warp_symbol",
        title: "Backward sloping warp thread",
        selected_stroke: "#000000"
      },
      {
        new_warp: "v_left",
        symbol: "#v_left_warp_symbol",
        title: "Vertical warp thread at left",
        selected_stroke: "#000000"
      },
      {
        new_warp: "v_center",
        symbol: "#v_center_warp_symbol",
        title: "Vertical warp thread at right",
        selected_stroke: "#000000"
      },
      {
        new_warp: "v_right",
        symbol: "#v_right_warp_symbol",
        title: "Vertical warp thread at right",
        selected_stroke: "#000000"
      },
      {
        new_warp: "forward_empty",
        symbol: "#forward_empty_symbol",
        title: "Forward sloping empty hole",
        selected_stroke: "#FFFFFF"
      },
      {
        new_warp: "backward_empty",
        symbol: "#backward_empty_symbol",
        title: "Backward sloping empty hole",
        selected_stroke: "#FFFFFF"
      }

    ];

    for (var i=0; i<warps.length; i++)
    {
      warps[i].on = (current_warp ==  warps[i].new_warp) ? true: false
    }

    return warps;
  }
});

Template.view_pattern.events({
  // Make pattern private / public
  "click .toggle_private": function () {
      Meteor.call("set_private", this._id, !this.private);
  },
  // Show image uploader
  "click .show_image_uploader": function () {
      Session.set('upload_status', 'not started');
      Session.set('show_image_uploader', true);
  },
  "click #view_full_pattern": function () {
      Session.set('view_full_pattern', true);

      var pattern_id = Router.current().params._id;
  },
  'click #undo': function() {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.my_functions.undo(pattern_id);
    }
  },
  'click #redo': function() {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.my_functions.redo(pattern_id);
    }
  },
  // add rows
  'click #add_row_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var style = Meteor.my_functions.get_selected_style();
      
      Meteor.my_functions.add_weaving_row(pattern_id, 1, style);

    }
  },
  'click #add_row_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var style = Meteor.my_functions.get_selected_style();

      Meteor.my_functions.add_weaving_row(pattern_id, -1, style);
      
    }
  },
  'click .pattern .remove_row': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.remove_weaving_row(pattern_id, parseInt(this));
    }
  },
  'click #add_tablet_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var style = Meteor.my_functions.get_selected_style();

      Meteor.my_functions.add_tablet(pattern_id, 1, style);
    }
  },
  'click #add_tablet_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var style = Meteor.my_functions.get_selected_style();

      Meteor.my_functions.add_tablet(pattern_id, -1, style);
    }
  },
  'click .pattern .remove_tablet': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      Meteor.my_functions.remove_tablet(pattern_id, parseInt(this));
    }
  },
  'click .pattern li.cell': function(event, template){
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      var pattern = Patterns.findOne({_id: pattern_id});

      if (typeof pattern === "undefined")
        return;

      var number_of_rows = pattern.number_of_rows;
      var number_of_tablets = pattern.number_of_tablets;

      var new_style = Meteor.my_functions.get_selected_style();

      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.set_preview_cell_style(this.row, this.tablet, new_style);
     
      Meteor.my_functions.save_weaving_as_text(pattern_id, number_of_rows, number_of_tablets);
    }
  },
  'click .tablets li.cell': function(event, template) {
    if (Meteor.my_functions.accept_click())
    {
      var new_style = Meteor.my_functions.get_selected_style();

      var pattern_id = Router.current().params._id;
      var pattern = Patterns.findOne({_id: pattern_id});

      if (typeof pattern === "undefined")
        return;

      var number_of_tablets = pattern.number_of_tablets;

      Meteor.my_functions.set_threading_cell_style(this.hole, this.tablet, new_style);

      Meteor.my_functions.save_threading_as_text(pattern_id, number_of_tablets);
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .tablets .row.orientation li': function(event, template)
  {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var new_orientation = "S";
      if (this.orientation == "S")
      {
        new_orientation = "Z";
      }

      var obj = current_orientation[this.tablet-1];
        obj.orientation = new_orientation;
        current_orientation.splice(this.tablet-1, 1, obj);

      Meteor.my_functions.save_orientation_as_text(pattern_id);
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click #change_handedness': function()
  {
    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    Meteor.call('toggle_hole_handedness', pattern_id);
  }
});
/*
Template.styles_palette.events({
  'click .edit_style .warps .forward': function() {
    Meteor.my_functions.edit_style_warp("forward");
  },
  'click .edit_style .warps .backward': function() {
    Meteor.my_functions.edit_style_warp("backward");
  },
  'click .edit_style .warps .v_left': function() {
    Meteor.my_functions.edit_style_warp("v_left");
  },
  'click .edit_style .warps .v_center': function() {
    Meteor.my_functions.edit_style_warp("v_center");
  },
  'click .edit_style .warps .v_right': function() {
    Meteor.my_functions.edit_style_warp("v_right");
  },
  'click .edit_style .warps .forward_empty': function() {
    Meteor.my_functions.edit_style_warp("forward_empty");
  },
  'click .edit_style .warps .backward_empty': function() {
    Meteor.my_functions.edit_style_warp("backward_empty");
  }
 });*/

