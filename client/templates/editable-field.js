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
  this.error = new ReactiveVar();
  
  this.toggle_edit = function(template, collection, property){
    var editing = !template.editing.get();
    template.editing.set(editing);
    template.error.set("");

    if (editing)
    {
      Session.set("editing_text", true);
      // WARNING the class check attempts to ensure that focus is given to the correct input. But this function is not scoped inside the template, so if there is currently another input with the same class, it may steal focus and trigger the change event, causing the editable field input to go off immediately.
      setTimeout(function(){$('.editable_field .text_input').focus()}, 50);
    }
    else
    {
      var new_value = $('.text_input').val();
      Session.set("editing_text", false);

      var route_name = Router.current().route.getName();
      switch (route_name)
      {
        case "pattern":
        case "user":
          var object_id = Router.current().params._id;
          break;

        case "account_settings":
        case "my_patterns":
          var object_id = Meteor.userId();
          break;
      }
      var template = template;
      Meteor.call('update_text_property', collection, object_id, property, new_value, function (error, result){
        
        if(error)
        {
          var text ="";
          switch(error.reason)
          {
            case "Email already exists.":
              text = "<span style=\"font-weight: bold;\">" + new_value + "</span> is already registered to another user.";
              break;

              default:
                text = error.reason; // this server error is not specifically handled so display the raw reason
          }
          template.error.set(text);
        }
      });
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
  },
  error: function() {
    return Template.instance().error.get();
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
    // WARNING! If there is another input on the page with the class "editable_field text_input", it will steal focus and trigger this event, causing the field input to flick on and off. It's ok if it's inside an editable field template because they can't both appear at once.
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

