Template.view_pattern.rendered = function() {
  $('body').attr("class", "view_pattern");
  if (Meteor.my_functions.can_edit_pattern(Router.current().params._id))
    $('body').addClass('editable');

  Session.set('edit_style', false);
  Session.set('styles_palette', 1);
  Session.set("selected_style", 1);

  Meteor.my_functions.add_to_recent_patterns(Router.current().params._id);
  Meteor.my_functions.initialize_route();
}

Template.view_pattern.onCreated(function(){
  var pattern_id = Router.current().params._id;
  Meteor.my_functions.build_pattern_display_data(pattern_id);
  
  // intialise the 'undo' stack
  // ideally the undo stack would be maintained over server refreshes but I'm not sure a session var could hold multiple patterns, and nothing else except the database is persistent. Also it doesn't need to be reactive so a session var might be a performance hit.
  stored_patterns = [];
  Session.set('undo_stack_position', -1);
  Meteor.my_functions.store_pattern(pattern_id);
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

    if (pattern.number_of_rows > 1) {
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        return true;
    }
  }
});

Template.view_pattern.helpers({
  /////////////////////
  // pattern
  can_remove_tablets: function() {
    // is there more than 1 tablet?
    var pattern_id = Router.current().params._id;
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
  // Edit style controls
  forward_stroke_on: function() {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    if (typeof selected_style === "undefined") // can be undefined at startup
        return;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        return;

    var style = current_styles.list()[selected_style-1];

    //var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});

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

    //var style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]});
    var style = current_styles.list()[selected_style-1];

    if (typeof style === "undefined")
        return;

    if (style.backward_stroke)
        return "on";
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
    Meteor.my_functions.initialize_line_color_picker();
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
    var pattern_id = Router.current().params._id;

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
  // Make pattern private / public
  "click .toggle_private": function () {
    Meteor.call("set_private", this._id, !this.private);
  },
  'click #undo': function() {
    var pattern_id = Router.current().params._id;
    Meteor.my_functions.undo(pattern_id);
  },
  'click #redo': function() {
    var pattern_id = Router.current().params._id;
    Meteor.my_functions.redo(pattern_id);
  },
  // add rows
  'click #add_row_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;
      
      Meteor.my_functions.add_weaving_row(pattern_id, 1, Session.get("selected_style"));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click #add_row_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.add_weaving_row(pattern_id, -1, Session.get("selected_style"));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .pattern .remove_row': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.remove_weaving_row(pattern_id, parseInt(this));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click #add_tablet_at_start': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.add_tablet(pattern_id, 1, Session.get("selected_style"));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click #add_tablet_at_end': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      Meteor.my_functions.add_tablet(pattern_id, -1, Session.get("selected_style"));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .pattern .remove_tablet': function () {
    if (Meteor.my_functions.accept_click())
    {
      var pattern_id = Router.current().params._id;

      Meteor.my_functions.remove_tablet(pattern_id, parseInt(this));
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .pattern li.cell': function(event, template){
    if (Meteor.my_functions.accept_click())
    {
      var new_style = Session.get("selected_style");
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var obj = current_weaving_cells[this.row-1][this.tablet-1];
      obj.style = new_style;
      current_weaving_cells[this.row-1].splice(this.tablet-1, 1, obj);
      
      Meteor.my_functions.save_weaving_as_text(pattern_id);
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .tablets li.cell': function(event, template) {
    if (Meteor.my_functions.accept_click())
    {
      var new_style = Session.get("selected_style");
      var pattern_id = Router.current().params._id;

      if (!Meteor.my_functions.can_edit_pattern(pattern_id))
        return;

      var obj = current_threading_cells[this.hole-1][this.tablet-1];
      obj.style = new_style;
      current_threading_cells[this.hole-1].splice(this.tablet-1, 1, obj);

      Meteor.my_functions.save_threading_as_text(pattern_id);
      Meteor.my_functions.store_pattern(pattern_id);
    }
  },
  'click .tablets .row.orientation li': function(event, template)
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

    var style = current_styles[selected_style-1];
    var forward_stroke = !style.forward_stroke;

    var options = { forward_stroke: forward_stroke };
    var pattern_id = Router.current().params._id;

    // update local reactiveArray
    var obj = current_styles[style.style-1];
    if (forward_stroke)
      obj.forward_stroke = "forward_stroke";

    else
      obj.forward_stroke = null;

    current_styles.splice(style.style-1, 1, obj);

    // update database
    Meteor.my_functions.save_styles_as_text(pattern_id);
    Meteor.my_functions.store_pattern(pattern_id);
  },
  'click .edit_style .backward_stroke': function () {
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    var style = current_styles[selected_style-1];
    var backward_stroke = !style.backward_stroke;

    var options = { backward_stroke: backward_stroke };
    var pattern_id = Router.current().params._id;

    // update local reactiveArray
    var obj = current_styles[style.style-1];
    if (backward_stroke)
      obj.backward_stroke = "backward_stroke";

    else
      obj.backward_stroke = null;

    current_styles.splice(style.style-1, 1, obj);

    // update database
    Meteor.my_functions.save_styles_as_text(pattern_id);
    Meteor.my_functions.store_pattern(pattern_id);
  }
 });
