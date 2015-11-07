Template.weave_pattern.rendered = function() {
  $('body').attr("class", "weave");
  Session.set('menu_open', false);
  Session.set('show_pattern_as_text', false);
  Meteor.my_functions.initialize_weave();
  Meteor.my_functions.resize_page();
  Meteor.my_functions.reset_scroll();
}

Template.weave_pattern.helpers({
  selected_row: function(){
    return Session.get('current_weave_row');
  },
  selected_class: function(row_index) {
    if (Session.equals('current_weave_row', row_index))
        return "selected";
  },
  is_selected_row: function(row_index) {
    if (Session.equals('current_weave_row', row_index))
        return true;
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
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});
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
  }
});
