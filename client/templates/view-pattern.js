Template.view_pattern.rendered = function() {
  Session.set('hide_preview', true);
  Session.set('hide_while_loading', true);

  $('body').attr("class", "view_pattern");
  var pattern_id = Router.current().params._id;

  Meteor.my_functions.add_to_recent_patterns(pattern_id);
  Meteor.my_functions.view_pattern_render(pattern_id);
  Meteor.my_functions.initialize_route();

  Session.set('show_image_uploader', false);
  Session.set('upload_status', 'not started');
  Session.set('edited_pattern', false);

  Meteor.my_functions.set_repeats(pattern_id);

  if (Router.current().params.mode)
    Session.set('view_pattern_mode', Router.current().params.mode);

  else
    Session.set('view_pattern_mode', "charts");

  // is this a new pattern and needs the preview to be generated?
  if (typeof $('.auto_preview path')[0] === "undefined")
    Session.set('edited_pattern', true);

  // for some reason, including some templates immediately causes a big delay in loading
  setTimeout(function(){
    Session.set("hide_preview", false);
    Session.set("hide_while_loading", false);
  }, 1);




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

  if (Meteor.my_functions.pattern_exists(pattern_id));
  {
    Meteor.my_functions.view_pattern_created(pattern_id);

    /////////
    // Images
    Tracker.autorun(function() {
      Meteor.subscribe('images');
    });
  }
});

Template.pattern_not_found.helpers({
  'id': function(){
    return Router.current().params._id;
  }
});

Template.remove_row.helpers({
  can_remove_rows: function() {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
      return;

    // is there more than 1 row?   
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_rows: 1}});

    if (pattern.number_of_rows > 1) {
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
    }
  }
});

Template.view_pattern.helpers({
  /////////////////////
  // pattern
  mode: function() {
  if (Router.current().params.mode == "charts")
    return "charts";
  else
    return "summary"; // default if no mode specified
  },
  is_selected_main_tab: function(mode) {
    if (Session.get('view_pattern_mode') == mode)
      return "selected";
  },
  auto_repeats: function() {
    return Session.get("number_of_repeats");
  },
  packs: function() {
    var packs = new Array();

    var data = current_manual_weaving_turns.list()[0]; // row 0 is just for working
    if (typeof data === "undefined")
        return; // can happen when tab first selected if there are no rows
    for (var i=Meteor.my_params.number_of_packs-1; i>=0; i--) // reverse order
    {
      var pack_number = data.packs[i].pack_number
      var new_pack = {
        tablets: new Array(),
        pack_number: pack_number,
        direction: data.packs[i].direction,
        number_of_turns: data.packs[i].number_of_turns
      }

      for (var j=0; j<Session.get("number_of_tablets"); j++)
      {
        var obj = {
          pack: i+1,
          tablet: j+1
        }

        if(data.tablets[j] == pack_number)
          obj.selected = true;

        else
          obj.selected = false;

        new_pack.tablets.push(obj);
      }
      packs.push(new_pack);
    }
    
    return packs;
  },
  manual_pack_width: function() {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
      return;

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_tablets: 1}});
    if ($('#toolbar .packs_inner .row:first-child').length == 0)
        return 600;
      
    var width = 0;

    $('#toolbar .packs_inner .row:first-child').children(':not(:last-child)').each(function() {
        width += $(this).outerWidth( true );
    });

    width += $($($('#toolbar .packs_inner .row:first-child :last-child')[0]).children()[0]).outerWidth(true) * pattern.number_of_tablets;

    return Math.max(width, 600);
  },
  weave_disabled: function() {
    // cannot add a row to manual simulation pattern
    if (current_manual_weaving_turns.length > 300)
      return "disabled";
  },
  add_tablet_positions: function() {
    return Session.get("number_of_tablets") + 1;
  },
  add_row_positions: function() {
    return Session.get("number_of_rows") + 1;
  },
  can_add_tablets: function() {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
      return;

    // are there more than 60 tablets?  
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_tablets: 1}});

    if (pattern.number_of_tablets < 60)
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
  },
  can_remove_tablets: function() {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
        return;

    // is there more than 1 tablet?
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_tablets: 1}});

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
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
        return;

    // are the tablet holes labelled clockwise or anticlockwise?
    // default is clockwise if not otherwise specified
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { hole_handedness: 1}});

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
    return Images.find({$and:
      [
        { used_by: pattern_id },
        { role: "preview"}
      ]
    });
  },
  // non-preview pattern images, if any
  /*'pattern_image': function() {
    var pattern_id = Router.current().params._id;
    return Images.find({$and: [
      { used_by: pattern_id },
      { role: "image"}]
    });
  },*/
  // all pattern images, whether preview or not
  'pattern_image': function() {
    var pattern_id = Router.current().params._id;
    return Images.find({$and: 
      [
        { used_by: pattern_id },
        { $or:
          [
            { role: "image"},
            { role: "preview"}
          ]
        }
      ]
    });
  }
});

Template.orientation.helpers({
  'style_orientation': function(tablet) {
console.log("style_orientation for tablet " + tablet);
console.log("orientation is " + current_orientation[tablet.toString()].get());
    if (current_orientation[tablet.toString()].get() == "Z")
        return "orientation_z";

    else
        return "orientation_s";
  },
  'testorient': function(tablet) {
    console.log("test. Tablet: " + tablet);
    //return current_orientation[tablet.toString()].get();
    //return current_orientation["1"].get();
    return testreact.get();
  }
});

Template.auto_sequence.helpers({
  'auto_turn_sequence': function() {
    // weaving sequence for auto simulation pattern
    if (typeof current_auto_turn_sequence !== "undefined")
      return current_auto_turn_sequence.list();   
  }
})

Template.styles_palette.onRendered(function(){
  var pattern_id = Router.current().params._id;

  if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;

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
  "click #main_tabs .summary a": function() {
    Session.set("loading", true);

    var pattern_id = Router.current().params._id;
    setTimeout(function(){
      Session.set('view_pattern_mode', "summary");
      Router.go('pattern', { _id: pattern_id, mode: "summary" });
    }, 100);   
  },
  "click #main_tabs .charts a": function() {
    Session.set("loading", true);

    var pattern_id = Router.current().params._id;
    setTimeout(function(){
      Router.go('pattern', { _id: pattern_id, mode: "charts" });
      Session.set('view_pattern_mode', "charts");
    }, 100);
  },
  'click #delete': function(event) {
    event.preventDefault();
    var pattern_id = Router.current().params._id;
    var r = Meteor.my_functions.delete_pattern(pattern_id);

    if (r == true)
      Router.go('my_patterns');
  },
  // Make pattern private / public
  "click .toggle_private": function () {
      Meteor.call("set_private", this._id, !this.private);
  },
  // Show image uploader
  "click .show_image_uploader": function () {
      Session.set('upload_status', 'not started');
      Session.set('show_image_uploader', true);
  },
  'click #undo': function() {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;
    Meteor.my_functions.undo(pattern_id);
  },
  'click #redo': function() {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;
    Meteor.my_functions.redo(pattern_id);
  },
  // add rows
  'click #add_row_at_start': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var style = Meteor.my_functions.get_selected_style();
    
    Meteor.my_functions.add_weaving_row(pattern_id, 1, style);
  },
  'click #add_row_at_end': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var style = Meteor.my_functions.get_selected_style();

    Meteor.my_functions.add_weaving_row(pattern_id, -1, style);
  },
  'click .pattern .remove_row': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    Meteor.my_functions.remove_weaving_row(pattern_id, parseInt(this));
  },
  'click #add_tablet_at_start': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var style = Meteor.my_functions.get_selected_style();

    Meteor.my_functions.add_tablet(pattern_id, 1, style);
  },
  'click #add_tablet_at_end': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var style = Meteor.my_functions.get_selected_style();

    Meteor.my_functions.add_tablet(pattern_id, -1, style);
  },
  'click .pattern .remove_tablet': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;
    Meteor.my_functions.remove_tablet(pattern_id, parseInt(this));
  },
  'click .pattern li.cell': function(event, template){
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
        return;
    
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {number_of_rows: 1, number_of_tablets: 1}});
    var number_of_rows = pattern.number_of_rows;
    var number_of_tablets = pattern.number_of_tablets;
    var new_style = Meteor.my_functions.get_selected_style();

    Meteor.my_functions.set_weaving_cell_style(this.row, this.tablet, new_style);
    Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows, number_of_tablets);
  },
  'click .tablets li.cell': function(event, template) {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

    if (!Meteor.my_functions.accept_click())
        return;

    if (!Meteor.my_functions.pattern_exists(pattern_id))
        return;

    var new_style = Meteor.my_functions.get_selected_style();
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, number_of_tablets: 1}});

    if (typeof pattern === "undefined")
      return;

    var number_of_tablets = pattern.number_of_tablets;

    if (pattern.edit_mode == "simulation")
    {
      var old_style = current_threading[this.hole.toString() + "_" + this.tablet.toString()].get();
      Meteor.my_functions.change_sim_thread_color(pattern_id, this.tablet, this.hole, old_style, new_style);
    }

    Meteor.my_functions.set_threading_cell_style(this.hole, this.tablet, new_style);
    Meteor.my_functions.save_threading_to_db(pattern_id, number_of_tablets);

    if (pattern.edit_mode != "simulation")
      Meteor.my_functions.store_pattern(pattern_id);
  },
  'click .tablets .row.orientation li': function(event, template)
  {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

    var new_orientation = "S";
    
    if (current_orientation[this].get() == "S")
    {
      new_orientation = "Z";
    }

    //console.log("testreact.get() " + testreact.get())
    if (testreact.get() == "S")
    {
      Session.set("testreact", "Z");
      testreact.set("Z");
      //console.log("setting testreact to Z");
    }
    else
    {
      Session.set("testreact", "S");
      testreact.set("S");
      //console.log("setting testreact to S");
    }
    console.log("new testreact.get() " + testreact.get())

    current_orientation[this.toString()].set(new_orientation);

    Meteor.my_functions.save_orientation_to_db(pattern_id);

    if (pattern.edit_mode == "simulation")
      Meteor.my_functions.reset_simulation_weaving(pattern_id);

    else
      Meteor.my_functions.store_pattern(pattern_id);
  },
  'click #change_handedness': function()
  {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    Meteor.call('toggle_hole_handedness', pattern_id);
  },
  /////////////////////////////////
  // Simulation patterns
  // tabs
  'click #toolbar .tabs li': function(event) {
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    Session.set("loading", true);

    var simulation_mode = "auto";

    if ($(event.currentTarget).hasClass("manual"))
      simulation_mode = "manual";

    Meteor.my_functions.toggle_simulation_mode(pattern_id, simulation_mode);
  },
  // auto
  'input .auto #num_auto_turns': function(event)
  {
    // change number of turns in auto_turn_sequence for simulation pattern
    // timeout because event fires on keyup and otherwise causes a double update if you type a 2-digit number and resets all turns to "F"
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    if (event.currentTarget.value != Math.floor(event.currentTarget.value))
      event.currentTarget.value = Math.floor(event.currentTarget.value); // user pastes in a non-integer value

    if (event.currentTarget.value > Meteor.my_params.max_auto_turns)
      event.currentTarget.value = Meteor.my_params.max_auto_turns;

    if (event.currentTarget.value < 1)
      event.currentTarget.value = 1;
   
    auto_input_timeout = setTimeout(function() {

      var num_auto_turns = parseInt(event.currentTarget.value);
      var old_num_turns = current_auto_turn_sequence.length;

      if (old_num_turns != num_auto_turns)
      {
        var difference = old_num_turns - num_auto_turns;

        if (difference < 0)
        {
          for (var i=0; i<(-1 * difference); i++)
          {
            var new_turn = {
              direction: "F",
              turn: i+1
            }
            current_auto_turn_sequence.push(new_turn);
          }
        }
        else
        {
          current_auto_turn_sequence.splice(current_auto_turn_sequence.length - difference, difference);
        }

        var auto_turn_sequence = Meteor.my_functions.get_auto_turn_sequence_as_array();

        Meteor.call("set_auto_number_of_turns", pattern_id, auto_turn_sequence, function(){       
          Meteor.my_functions.reset_simulation_weaving(pattern_id);
          Meteor.my_functions.set_repeats(pattern_id);
        });
      }
    }, 300);  
  },
  'click .auto .direction': function()
  {
    // change direction of turn in auto_turn_sequence for simulation pattern
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var current_direction = current_auto_turn_sequence[this.turn - 1].direction;
    if (current_direction == "F")
      current_auto_turn_sequence[this.turn - 1].direction = "B";

    else
      current_auto_turn_sequence[this.turn - 1].direction = "F";

    Meteor.call("toggle_turn_direction", pattern_id, this.turn, function(){
      Meteor.my_functions.reset_simulation_weaving(pattern_id);
      Meteor.my_functions.set_repeats(pattern_id);
    });
  },
  // manual
  'click .manual .direction': function() {
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    var obj = current_manual_weaving_turns.valueOf()[0]; // use row 0 as working row

    var current_direction = obj.packs[this.pack_number - 1].direction;
    var new_direction = "F";

    if(current_direction == "F")
      new_direction = "B";

    obj.packs[this.pack_number - 1].direction = new_direction;
    current_manual_weaving_turns.splice(0, 1, obj);
  },
  'input .manual .num_manual_turns': function(event)
  {
    // change number of turns for a pack in manual simulation pattern
    //if (!Meteor.my_functions.accept_click())
        //return;
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (event.currentTarget.value != Math.floor(event.currentTarget.value))
      event.currentTarget.value = Math.floor(event.currentTarget.value); // user pastes in a non-integer value

    if (event.currentTarget.value > 3)
      event.currentTarget.value = 3;

    if (event.currentTarget.value < 0)
      event.currentTarget.value = 0;

    //if (Session.get('manual_input_latch'))
      //Session.set('manual_input_latch', true);

    //var that = this;

    //manual_input_timeout = setTimeout(function() {
      var obj = current_manual_weaving_turns.valueOf()[0]; // use row 0 as working row
      obj.packs[this.pack_number - 1].number_of_turns = parseInt(event.currentTarget.value);
      current_manual_weaving_turns.splice(0, 1, obj);
    //}, 300);    
  },
  'click .manual .tablets li': function(event) {
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    var obj = current_manual_weaving_turns.valueOf()[0]; // use row 0 as working row
    var new_pack = this.pack;

    if (obj.tablets[this.tablet-1] == this.pack)
      // tablet already in pack, so move it up one pack
      {
        new_pack = (new_pack + 1);
        if (new_pack == 4)
          new_pack = 1;
      }

    obj.tablets[this.tablet-1] = new_pack;
    current_manual_weaving_turns.splice(0, 1, obj);
  },
  'click #weave': function () {
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    Meteor.my_functions.weave_button(pattern_id);
  },
  'click #unweave': function () {
    var pattern_id = Router.current().params._id
    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    if (!Meteor.my_functions.accept_click())
        return;

    Meteor.my_functions.unweave_button(pattern_id);
  },
  'click #add_tablet': function () {
    // add tablet at indicated position, e.g. position 1 = new tablet is #1
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var position = $('#tablet_to_add').val();

    // basic data validation, must be an integer between 1 and number of tablets + 1 (new tablet at end)
    position = Math.floor(position);
    position = Math.max(position, 1);
    position = Math.min(position, Session.get("number_of_tablets")+1);

    var style = Meteor.my_functions.get_selected_style();

    Meteor.my_functions.add_tablet(pattern_id, position, style);
  },
  'click #remove_tablet': function () {
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var position = $('#tablet_to_remove').val();

    // basic data validation, must be an integer between 1 and number of tablets
    position = Math.floor(position);
    position = Math.max(position, 1);
    position = Math.min(position, Session.get("number_of_tablets"));
    ///if position = 

    Meteor.my_functions.remove_tablet(pattern_id, position);
  },
  'click #add_row': function () {
    // add row at indicated position, e.g. position 1 = new row is #1
    if (!Meteor.my_functions.accept_click())
        return;

    var pattern_id = Router.current().params._id;

    if (!Meteor.my_functions.can_edit_pattern(pattern_id))
      return;

    var position = $('#row_to_add').val();
    var style = Meteor.my_functions.get_selected_style();
    var num_new_rows = $('#num_new_rows').val();

    Meteor.my_functions.add_weaving_row(pattern_id, position, style, num_new_rows);
  }
});


