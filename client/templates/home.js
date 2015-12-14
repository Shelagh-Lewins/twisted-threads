Template.home.rendered = function() {
  $('body').attr("class", "home");
  Meteor.my_functions.initialize_route();
  //Meteor.subscribe('weaving'); // TODO remove
  //Meteor.subscribe('threading'); // TODO remove
  //Meteor.subscribe('orientation'); // TODO remove
}

// *** create_new_pattern *** //
Template.create_new_pattern.events({
  'submit form': function(event){
    event.preventDefault();

    var number_of_tablets = $('#num_tablets').val();
    var number_of_rows = $('#num_rows').val();
    var pattern_name = $('#pattern_name').val();

    Meteor.my_functions.new_pattern(pattern_name, number_of_tablets, number_of_rows);

    $('[name=pattern_name]').val(''); // reset pattern name
    // however do not reset numbers, in case user wants to create another similar pattern?
  }
});

// *** Display patterns *** //
// *** patterns *** //
Template.patterns.helpers({
  recent_patterns: function(){
    if (Meteor.userId()) // user is signed in
    {
      var pattern_ids = Recent_Patterns.find({}, {sort: {accessed_at: -1}}).map(function(pattern){ return pattern.pattern_id});
    }
    else
    {
      var pattern_ids = Meteor.my_functions.get_local_recent_pattern_ids();
    }
    // return the patterns in recency order
    var patterns = [];
    for (var i=0; i<pattern_ids.length; i++)
    {
      var id = pattern_ids[i];
      // Check for null id or non-existent pattern
      if (id == null) continue;
      if (typeof id === "undefined") continue;
      
      var pattern = Patterns.findOne({_id: id});
      if (typeof pattern === "undefined") continue;

      patterns.push(pattern);
    }

    return patterns; // Note this is an array because order is important, so in the template use .length to find number of items, not .count
  },
  not_recent_patterns: function(){
    // any visible pattern that is not shown in Recent Patterns
    if (Meteor.userId()) // user is signed in
      var pattern_ids = Recent_Patterns.find().map(function(pattern){ return pattern.pattern_id});

    else
    {
      var pattern_ids = Meteor.my_functions.get_local_recent_pattern_ids();
    }

    return Patterns.find({_id: {$nin: pattern_ids}}); // This is a cursor use use .count in template to find number of items
  },
  all_patterns: function(){
    return Patterns.find({}, {sort: {name: 1}});
  }
});

/* *** Individual pattern in list *** */
Template.pattern_overview.helpers({
  created_by_current_user: function () {
    return this.created_by === Meteor.userId();
  }
});

Template.pattern_overview.events({
// Delete pattern
  'click input.delete': function() {
    var name = Patterns.findOne({ _id: this._id}).name;
    var pattern_id = this._id;

    var r = confirm(name + "\nDo you want to delete this pattern?");
    if (r == true)
    {
      Meteor.call('remove_pattern', pattern_id);
    }
  },
  "click .toggle_private": function () {
    Meteor.call("set_private", this._id, !this.private);
  }
});


