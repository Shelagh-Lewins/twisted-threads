// a resable template to edit a text property of a collection
// TODO single, multiple line input / textarea
if (Meteor.isClient) {
  // http://stackoverflow.com/questions/28015971/pass-parameters-to-template-without-overriding-data-context
  // extendContext allows you to pass in extra arguments to a helper  without overriding the current data context
  UI.registerHelper('extendContext', function(data){
    var result = _.clone(this);
    _.each(data.hash, function(value, key) {
      result[key] = value;
    })
    return result;
  });
}

Template.editable_field.onCreated(function() {
  this.down = false;
  this.blur = false;
  this.change_latch = false;
  this.editing = new ReactiveVar(false);

  this.toggle_edit = function(template, collection, property){
    var editing = !template.editing.get();
    template.editing.set(editing);

    if (editing)
    {
      Session.set("editing_text", true);
      setTimeout(function(){$('.text_input').focus()}, 50);
    }
    else
    {
      Session.set("editing_text", false);
      var pattern_id = Router.current().params._id;
      var new_value = $('.text_input').val();
      Meteor.call('update_text_property', collection, pattern_id, property, new_value);
    }
    setTimeout(function(){ Meteor.my_functions.resize_page(); }, 0);
  }
})

Template.editable_field.helpers({
  can_edit: function(_id){
    switch(Template.instance().data.collection)
    {
      case "patterns":
        return Meteor.my_functions.can_edit_pattern(_id);

      case "users":
        return (Meteor.userId() == _id)
    }
  },
  editing: function(){
    return Template.instance().editing.get();
  }
})

Template.editable_field.events({
  'click button.edit': function(event, template) {
    event.preventDefault();
    
    if (!template.down)
      template.toggle_edit(template, this.collection, this.property);
  },
  'mousedown button.edit': function(event, template) {
    template.down = true;
  },
  'mouseup button.edit': function(event, template) {
    event.preventDefault();

    if (template.down && !template.blur)
      template.toggle_edit(template, this.collection, this.property);
    
    var that = template;
    setTimeout(function(){
      that.down = false;
      that.blur = false;
      }, 20);
  },
  'mouseout button.edit': function(event, template) {
    template.down = false;
    template.blur = false;
  },
  'change .text_input, focusout .text_input': function(event, template) {

    if (!template.change_latch)
    {
      template.change_latch = true;

      if (template.down)
        template.blur = true;

      template.toggle_edit(template, this.collection, this.property);
      var that = template;
      setTimeout(function(){ that.change_latch = false}, 20);
    }
  }
})

