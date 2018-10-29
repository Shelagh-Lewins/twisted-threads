Template.weave_pattern.rendered = function() {
  $('body').attr("class", "weave");
  Meteor.my_functions.initialize_weave();
  Meteor.my_functions.initialize_route();

  // avoid adding a duplicate event every time the template is rendered
  $('body').unbind('keyup', Meteor.my_functions.weave_arrow_click);
  $('body').bind('keyup', Meteor.my_functions.weave_arrow_click);
}

Template.weave_pattern.onCreated(function(){
  var pattern_id = Router.current().params._id;

  // set session variables to avoid checking db every time
  if (Meteor.my_functions.pattern_exists(pattern_id));
  {
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1}});

    Session.set("edit_mode", pattern.edit_mode);

    if (pattern.edit_mode == "simulation")
      Session.set("simulation_mode", pattern.simulation_mode);
  }

  Meteor.my_functions.clear_pattern_display_data();
  Meteor.my_functions.build_pattern_display_data(pattern_id);
});

// used in 2 templates
UI.registerHelper('selected_row', function(){
  return Session.get('current_weave_row');
});

Template.weave_row.helpers({
  selected_class: function(row_index) {
    if (Session.equals('current_weave_row', row_index))
        return "selected";
  }
});

Template.weave_row_buttons.helpers({
  is_selected_row: function(row_index) {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});

    if (pattern.weaving_start_row) {
      row_index = row_index - pattern.weaving_start_row + 1;
    }
    if (Session.equals('current_weave_row', row_index)) {
      console.log(`row_index ${row_index}`);
        return true;
      }
  }
});

Template.weave_pattern.events({
  'change #current_row_input': function () {
    var row_number = $('#current_row_input').val();
    row_number = Meteor.my_functions.validate_row_number_input(row_number);

    $('#current_row_input').val(row_number);
    
    Meteor.my_functions.set_current_weave_row(row_number);
  },
  'click .previous_row': function() {
    var row_number = Session.get('current_weave_row') - 1;
    
    Meteor.my_functions.set_current_weave_row(row_number);
  },
  'click .next_row': function() {
    var row_number = Session.get('current_weave_row') + 1;
    
    Meteor.my_functions.set_current_weave_row(row_number);
  },
  'click #first_row': function() {
    var row_number = 1;
    
    Meteor.my_functions.set_current_weave_row(row_number);

    setTimeout(function(){
        Meteor.my_functions.scroll_selected_row_into_view();
      }, 50);
  },
  'click #last_row': function() {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});
    var row_number = pattern.number_of_rows;

    Meteor.my_functions.set_current_weave_row(row_number);
  },
  'keyup': function(event, template) {
    event.preventDefault();
  }
});
