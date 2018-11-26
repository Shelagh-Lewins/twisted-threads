Template.print_pattern.rendered = function() {
  $('body').attr("class", "print");
}

Template.print_pattern.onCreated(function(){
  var pattern_id = Router.current().params._id;

  // set session variables to avoid checking db every time
  if (Meteor.my_functions.pattern_exists(pattern_id));
  {
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1, weaving_start_row: 1}});

    Session.set("edit_mode", pattern.edit_mode);

    if (pattern.edit_mode == "simulation")
      Session.set("simulation_mode", pattern.simulation_mode);
  }

  Meteor.my_functions.clear_pattern_display_data();
  Meteor.my_functions.build_pattern_display_data(pattern_id);
  Meteor.my_functions.set_repeats(pattern_id);

  if (pattern.weaving_start_row) {
    Meteor.my_functions.rebuild_offset_threading(pattern_id, pattern.weaving_start_row);
  }
});

Template.print_pattern.helpers({
  hostname: function(){
    return location.hostname;
  },
  is_sim_auto: function() {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({ _id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1 }});

    if (typeof pattern === "undefined")
        return;

    var is_sim_auto = false;

    if (pattern.edit_mode == "simulation")
      if (pattern.simulation_mode == "auto") // freehand patterns can come up with simulation_mode 'auto' even though edit_mode is "freehand"
        is_sim_auto = true;

    return is_sim_auto;
  },
  auto_preview_width: function() {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({ _id: pattern_id}, {fields: {number_of_tablets: 1 }});

    return 10 * pattern.number_of_tablets;
  },
  auto_preview_height: function() {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({ _id: pattern_id}, {fields: {number_of_rows: 1, preview_rotation: 1 }});
    var number_of_repeats = 1;
    if (pattern.preview_rotation !== "up" && typeof Session.get("number_of_repeats") !== "undefined") {
      number_of_repeats = Session.get("number_of_repeats");
    }

    return 10 * pattern.number_of_rows * number_of_repeats;

  },
  print_repeats: function() {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({ _id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1, preview_rotation: 1, auto_turn_sequence: 1, preview_rotation: 1 }});

    var number_of_repeats = 1;
    if ((pattern.edit_mode == "simulation") && (pattern.simulation_mode == "auto") && (pattern.preview_rotation == "up") &&
      Meteor.my_functions.does_pattern_repeat(pattern_id)) {
        number_of_repeats = Math.floor(Meteor.my_params.max_auto_turns/pattern.auto_turn_sequence.length);
    }

    var repeats = [];
    for (var i=0; i<number_of_repeats; i++)
    {
      repeats.push(i);
    }

    return repeats;
  },
  margin: function(width, height) {
    if (this.index == 0) {
      return height;
    } else {
      return -1 * (width - height + 10);
    }
  }
});

Template.print_pattern.events({
  'click #print_hint .close': function() {
    $('#print_hint').removeClass("visible");
  }
});
