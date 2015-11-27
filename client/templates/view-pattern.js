Template.view_pattern.rendered = function() {
  $('body').attr("class", "view_pattern");
  if (Meteor.my_functions.can_edit_pattern(Router.current().params._id))
    $('body').addClass('editable');

  Session.set('edit_style', false);
  Session.set('styles_palette', 1);
  Session.set("selected_style", 1);

  Meteor.my_functions.add_to_recent_patterns(Router.current().params._id);

  // latches for handling edit name
  name_down = false;
  name_blur = false;
  name_change_latch = false;

  // latches for handling edit description
  description_down = false;
  description_blur = false;
  description_change_latch = false;

  Meteor.my_functions.initialize_route();
}

Template.pattern_not_found.helpers({
  'id': function(){
    return Router.current().params._id;
  }
});

Template.view_pattern.helpers({
  editing_pattern_name: function() {
    var pattern_id = Router.current().params._id;

    if (Meteor.my_functions.can_edit_pattern(pattern_id))
    {
      if (Session.equals('editing_pattern_name', true))
        return true;

      else
        return false;
    }
  },
  ////////////////////
  // Pattern info
  selected_pattern_description: function () {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var description = pattern.description;
    if ((typeof description !== "undefined") || (description != null) || (description == ""))
        return description;
  },
  editing_pattern_description: function() {
    var pattern_id = Router.current().params._id;

    if (Meteor.my_functions.can_edit_pattern(pattern_id))
    {
      if (Session.equals('editing_pattern_description', true))
        return true;

      else
        return false;
    }
  },
  style_pattern_description: function() {
      var pattern_id = Router.current().params._id;
      var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var description = pattern.description;

    if ((typeof description === "undefined") || (description == null) || (description == ""))
    {
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return "no_description_exists";
    }
  },
  can_remove_tablets: function() {
    // is there more than 1 tablet?
    var pattern_id = Router.current().params._id;
    var second_tablet = Weaving.findOne({ $and: [{pattern_id: pattern_id}, {tablet: 2}]});

    if (typeof second_tablet !== "undefined")
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
  },
  can_remove_rows: function() {
    // is there more than 1 row?
    var pattern_id = Router.current().params._id;
    var second_row = Weaving.findOne({ $and: [{pattern_id: pattern_id}, {row: 2}]});

    if (typeof second_row !== "undefined") {
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
    }
  },

  // Edit style controls
  forward_stroke_on: function() {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    if (typeof selected_style === "undefined") // can be undefined at startup
        return;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;

    var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});

    if (typeof style === "undefined")
        return;
    
    if (style.forward_stroke)
        return "on";
  },
  backward_stroke_on: function() {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    if (typeof selected_style === "undefined") // can be undefined at startup
        return;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;

    var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});

    if (typeof style === "undefined")
        return;

    if (style.backward_stroke)
        return "on";
  }
});

Template.orientation.helpers({
  'tablet_orientation': function()
  {
    if (Session.equals("db_ready", false))
        return;

    var pattern_id = Router.current().params._id;

    return Orientation.find({ $and: [{pattern_id: pattern_id,}]}, {sort: {"tablet": 1}}).fetch();
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
  this.subscribe('styles', pattern_id, {
      onReady: function(){
      Meteor.my_functions.initialize_line_color_picker();
      Meteor.my_functions.initialize_background_color_picker();

      // correctly position the Edit Style panel
      var panel = $('#styles_palette .edit_style')[0];

      var offset = $('#styles_palette').outerHeight(true);
      panel.style.bottom = offset + "px";
      Meteor.my_functions.resize_page();
    }
  });

});

Template.styles_palette.helpers({
  editing_style: function() {
    if (Session.equals('edit_style', true))
        return "editing";
  },
  editing_text: function(){ // on touch devices, the styles palette interferes with text editing
    if (Session.equals('editing_pattern_name', true) || Session.equals('editing_pattern_description', true))
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
    var pattern_id = Router.current().params._id;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
      return [];

    else
    {
      if (typeof page === "undefined")
      {
        return Styles.find({ pattern_id: pattern_id }, {sort: {"style": 1}}).fetch();
      }

      else
      {
        var number_per_page = 16;
        var lower = (page - 1) * number_per_page;
        var upper = (page * number_per_page) + 1;
        return Styles.find({$and: [{ pattern_id: pattern_id}, { style: {$gt: lower, $lt: upper}}]}, {sort: {"style": 1}}).fetch();
      }
    }
  },
  style_pages: function() {
    // display styles in pages. Currently 32 styles are shown in 2 pages.
    return [1, 2];
  },
  style_page_class: function() {
    if (Session.equals('styles_palette', 1))
      return "page_1";

    else if (Session.equals('styles_palette', 2))
      return "page_2";
  },
  is_selected_style_palette: function(number) {
    if (Session.equals('styles_palette', number))
        return "selected";
  },
});

Template.view_pattern.events({
  // Edit name
  // code ensures the user can stop editing and save the name either by clicking "Done" or by moving focus out of the input, and keyboard nav works.
  'click button.edit_name': function(event) {
    event.preventDefault();
    
    if (!name_down)
      Meteor.my_functions.toggle_edit_name();

  },
  'mousedown button.edit_name': function(event) {
    name_down = true;
  },
  'mouseup button.edit_name': function(event) {
    event.preventDefault();

    if (name_down && !name_blur) // down then up = click. focus has just left the input
      Meteor.my_functions.toggle_edit_name();
    
    setTimeout(function(){
      name_down = false;
      name_blur = false;
      }, 20); // delay prevents same event being processed as click also. stopPropagation doesn't seem to work.
  },
  'mouseout button.edit_name': function() {
    name_down = false;
    name_blur = false;
  },
  'change #pattern_name_input, focusout #pattern_name_input': function(event) {
    // if the user types and then moves focus away, only process one event
    if (!name_change_latch)
    {
      name_change_latch = true;
      if (name_down)
        name_blur = true; // focus has been lost because user mouse-clicked the button. Tell the button not to process the event because this function has already done it.

      Meteor.my_functions.toggle_edit_name();
      setTimeout(function(){ name_change_latch = false}, 20);
    }
  },
  // Make pattern private / public
  "click .toggle_private": function () {
    Meteor.call("set_private", this._id, !this.private);
  },
  // Edit description uses similar logic to Edit name
  'click button.edit_description': function() {
    event.preventDefault();
    
    if (!description_down)
      Meteor.my_functions.toggle_edit_description();
  },
  'mousedown button.edit_description': function(event) {
    description_down = true;
  },
  'mouseup button.edit_description': function(event) {
    event.preventDefault();

    if (description_down && !description_blur)
      Meteor.my_functions.toggle_edit_description();
    
    setTimeout(function(){
      description_down = false;
      description_blur = false;
      }, 20);
  },
  'mouseout button.edit_description': function() {
    description_down = false;
    description_blur = false;
  },
  'change #pattern_description_input, focusout #pattern_description_input': function() {
    if (!description_change_latch)
    {
      description_change_latch = true;
      if (description_down)
        description_blur = true;

      Meteor.my_functions.toggle_edit_description();
      setTimeout(function(){ description_change_latch = false}, 20);
    }
  },
  // add rows
  'click #add_row_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.call('add_weaving_row', pattern_id, 1, Session.get("selected_style"));
    }
  },
  'click #add_row_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      Meteor.call('add_weaving_row', pattern_id, -1, Session.get("selected_style"));
    }
  },
  'click .pattern .remove_row': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.call('remove_row', pattern_id, parseInt(this));
    }
  },
  'click #add_tablet_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.call('add_tablet', pattern_id, 1, Session.get("selected_style"));
    }
  },
  'click #add_tablet_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.call('add_tablet', pattern_id, -1, Session.get("selected_style"));
    }
  },
  'click .pattern .remove_tablet': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;
      Meteor.call('remove_tablet', pattern_id, parseInt(this));
    }
  },
  'click .pattern li.cell': function(event, template){
    if (Meteor.my_functions.accept_click())
    {
      var new_style = Session.get("selected_style");
      var pattern_id = Router.current().params._id;

      Meteor.call('set_pattern_cell_style', pattern_id, this._id, new_style);
    }
  },
  'click .tablets li.cell': function(event, template) {
    if (Meteor.my_functions.accept_click())
    {
      var new_style = Session.get("selected_style");
      var pattern_id = Router.current().params._id;

      Meteor.call('set_threading_cell_style', pattern_id, this._id, new_style);
    }
  },
  'click .tablets .row.orientation li': function(event, template)
  {
    var pattern_id = Router.current().params._id;
    // although 'this' reads as a number here, it is actually an object and must be converted to an int for the method
    Meteor.call('toggle_orientation', pattern_id, this._id);
  }
});

Template.styles_palette.events({
 'click .styles .cell': function () {
    Session.set("selected_style", this.style);
    Meteor.my_functions.update_color_pickers();
  },
  'click #edit_style_button': function() {
    if (Session.equals('edit_style', true))
      Session.set('edit_style', false);

    else
      Session.set('edit_style', true);  
  },
  'click #styles_palette .pagination li.page_1 a': function(event, template) {
    event.preventDefault();
    Session.set('styles_palette', 1);
  },
  'click #styles_palette .pagination li.page_2 a': function(event, template) {
    event.preventDefault();
    Session.set('styles_palette', 2);
  },
  'click .edit_style .forward_stroke': function () {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});
    var forward_stroke = !style.forward_stroke;

    var options = { forward_stroke: forward_stroke };
    var pattern_id = Router.current().params._id;
    Meteor.call('edit_style', pattern_id, selected_style, options);
  },
  'click .edit_style .backward_stroke': function () {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});
    var backward_stroke = !style.backward_stroke;

    var options = { backward_stroke: backward_stroke };
    var pattern_id = Router.current().params._id;
    Meteor.call('edit_style', pattern_id, selected_style, options);
  }
 });
