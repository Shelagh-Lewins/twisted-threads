Meteor.methods({
  //////////////////////
  // Pattern management
  show_pattern_tags: function() {
    console.log("All tags " + Meteor.tags.find().fetch().map(function(tag) {return tag.name}));
  },
  new_pattern_from_json: function(options) {
    // options
    /* {
      name: "pattern name", //optional
      data: json data object,
      filename: "pattern.json" // one of filename or data is required
    } */

    check(options, {
      name: String,
      data: Match.Optional(Object),
      filename: Match.Optional(String)
      
    });

    if (!Meteor.isServer) // minimongo cannot simulate loading data with Assets
        return;

    if (!Meteor.userId()) {
      // Only logged in users can create patterns
      throw new Meteor.Error("not-authorized");
    }

    if (typeof options.data !== "undefined")
    {
      var data = options.data;
    }
    else if (typeof options.filename !== "undefined")
    {
      try {
        var data = JSON.parse(Assets.getText(options.filename));
      }
      catch(e)
      {
        return -1;
      }
    }
    else
    {
      return -1;
    }

    // Numbers of rows and columns
    if (typeof data.threading[0] === "undefined") // no rows of threading have been defined
      console.log("error creating pattern from JSON. No threading data");

    var number_of_rows = data.weaving.length;
    var number_of_tablets = data.threading[0].length; // there may be no weaving rows but there must be threading

    if(options.name == "")
      options.name = "New pattern";

    data.name = options.name;

    // tags
    if (typeof data.tags === "undefined")
      data.tags = [];

    var description ="";
    if (typeof data.description !== "undefined")
      description = data.description;

    var pattern_id = Patterns.insert({
        name: data.name,
        description: description,
        private: true, // patterns are private by default so the user can edit them before revealing them to the world
        // TODO add specific thumbnails for patterns
        thumbnail_url: "../images/default_pattern_thumbnail.png",
        number_of_rows: number_of_rows,
        number_of_tablets: number_of_tablets,
        created_at: new Date(),            // current time
        created_by: Meteor.userId(),           // _id of logged in user
        created_by_username: Meteor.user().username  // username of logged in user
      }, function(err, pattern_id) {
        // Tags
        for (var i=0; i<data.tags.length; i++)
        {
          Patterns.addTag(data.tags[i], { _id: pattern_id });
        }

        // Styles
        for (var i=0; i<32; i++) // create 32 styles
        {
          var style = data.styles[i];

          if (typeof style === "undefined") // use defaults if no data
          {
            var options = {
              background_color: "#FFFFFF",
              line_color: "#000000",
              forward_stroke: false,
              backward_stroke: false
            };
          }
          else
          {
            var options = {
              background_color: style.background_color,
              line_color: style.line_color,
              forward_stroke: style.forward_stroke,
              backward_stroke: style.backward_stroke
            };
          }

          Meteor.call('add_style', pattern_id, options);
        }

        // Pattern
        for (var i=0; i<number_of_tablets; i++)
        {
          // Threading
          for (var j=0; j<4; j++)
          {
            Threading.insert({
              pattern_id: pattern_id,
              tablet: i+1,
              hole: j+1,
              style: data.threading[j][i]
            });
          }

          // Orientation
          Orientation.insert({
            pattern_id: pattern_id,
            tablet: i+1,
            orientation: data.orientation[i]
          })

          // Weaving
          for (var j=0; j<number_of_rows; j++)
          {
            Weaving.insert({
              pattern_id: pattern_id,
              tablet: i+1,
              row: j+1,
              style: data.weaving[j][i]
            }, function(err, new_id){
            });
          }
        }
      });
    return pattern_id;
  },
  xml2js: function(data) {
    // use xml2js package to convert XML to JSON
    // see https://github.com/Leonidas-from-XIV/node-xml2js for documentation of xml2js
    check(data, String);

    var convertAsyncToSync  = Meteor.wrapAsync( xml2js.parseString ),
      resultOfAsyncToSync = convertAsyncToSync( data, {} ); // {} would be 'this' context if required
    return resultOfAsyncToSync;

    /*
    package:
    https://github.com/peerlibrary/meteor-xml2js
    meteor add peerlibrary:xml2js

    usage:
    https://github.com/Leonidas-from-XIV/node-xml2js

    wrapasync tutorial:
    https://themeteorchef.com/snippets/synchronous-methods/#tmc-using-wrapasync

    // usage from client:
    var data = "<root>Hello xml2js! New2</root>";
    Meteor.call('xml2js',data, function(error, result){
      if (!error) {
      console.log("got xml " + JSON.stringify(result));
      }
      else {
        console.log(error);
      }
    })
    */
  },
  ///////////////////////////////
  // Modify patterns
  remove_pattern: function(pattern_id) {
    check(pattern_id, String);

    if (!Meteor.isServer) // attempt to avoid error "server sent add for existing id"
        return;

    //var pattern = Patterns.findOne({_id: pattern_id});

    if (Patterns.find({ _id: pattern_id, created_by: Meteor.userId()}).count() == 0)

    //if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    //}

    Patterns.remove(pattern_id);
    Weaving.remove({pattern_id: pattern_id});
    Threading.remove({pattern_id: pattern_id});
    Orientation.remove({pattern_id: pattern_id});
    Styles.remove({pattern_id: pattern_id});
    Recent_Patterns.remove({pattern_id: pattern_id});
  },
  set_private: function (pattern_id, set_to_private) {
    check(pattern_id, String);
    check(set_to_private, Boolean);

    var pattern = Patterns.findOne(pattern_id);
 
    // Make sure only the pattern created_by can make a pattern private
    if (pattern.created_by !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Patterns.update(pattern_id, { $set: { private: set_to_private } });
  },

  ///////////////////////////////
  // Edit styles
  set_pattern_cell_style: function(pattern_id, cell_id, new_style)
  {
    check(pattern_id, String);
    check(cell_id, String);
    check(new_style, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }
    Weaving.update({_id: cell_id}, {$set: {style: new_style}});
  },
  set_threading_cell_style: function(pattern_id, cell_id, new_style)
  {
    check(pattern_id, String);
    check(cell_id, String);
    check(new_style, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    Threading.update({_id: cell_id}, {$set: {style: new_style}});
  },
  add_style: function(pattern_id, options) {
    check(pattern_id, String);
    check(options, Match.Optional(Object));

    var pattern = Patterns.findOne({_id: pattern_id});

    var style_number = Styles.find({ pattern_id: pattern_id }).count()+1;

    var options = options || {};
    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    if (typeof options.background_color === "undefined")
      options.background_color = "#FFFFFF";

    if (typeof options.line_color === "undefined")
      options.line_color = "#0000FF";

    if (typeof options.forward_stroke === "undefined")
      options.forward_stroke = false;

    if (typeof options.backward_stroke === "undefined")
      options.backward_stroke = false;

    Styles.insert({
      pattern_id: pattern_id,
      style: style_number,
      forward_stroke: options.forward_stroke,
      backward_stroke: options.backward_stroke,
      background_color: options.background_color,
      line_color: options.line_color
    })
  },
  edit_style: function(pattern_id, style_number, options) {
    check(pattern_id, String);
    check(style_number, Number);
    check(options, Match.Optional(Object));

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    var style_id = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: style_number}]})._id;

    var options = options || {};

    if (typeof options.background_color !== "undefined")
    {
      Styles.update({_id: style_id}, { $set: {background_color: options.background_color}});
    }

    if (typeof options.line_color !== "undefined")
    {
      Styles.update({_id: style_id}, { $set: {line_color: options.line_color}});
    }

    if (typeof options.is_dark !== "undefined")
    {
      Styles.update({_id: style_id}, { $set: {is_dark: options.is_dark}});
    }

    if (typeof options.forward_stroke !== "undefined")
    {
      Styles.update({_id: style_id}, { $set: {forward_stroke: options.forward_stroke}});
    }

    if (typeof options.backward_stroke !== "undefined")
    {
      Styles.update({_id: style_id}, { $set: {backward_stroke: options.backward_stroke}});
    }
  },

  //////////////////////////////////////
  // Recent patterns
  add_to_recent_patterns: function(pattern_id) {
    // Add a pattern to the Recent_Patterns collection
    // If it's already in the collection, update the accessed_at time
    // Recent patterns are stored for each user separately
    check(pattern_id, String);
    
    if (!Meteor.userId()) // user is not signed in
      return;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
      return; // the pattern doesn't exist

    if (Recent_Patterns.find({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
    {
      // the pattern is not in the list, so add it
      Recent_Patterns.insert({
        pattern_id: pattern_id,
        accessed_at: new Date(),            // current time
        user_id: Meteor.userId()
      });
    }
    else
    {
      // the pattern is already in the list, so update it
      Recent_Patterns.update({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]}, { $set: {accessed_at: new Date()}});
    }

    if (Recent_Patterns.find().count() > 50) // don't store too many patterns
    {
      var oldest_id = Recent_Patterns.find({}, {sort: {accessed_at: 1}}, {limit: 1}).fetch()[0]._id;

      Recent_Patterns.remove({_id: oldest_id});
    }
  },
  maintain_recent_patterns: function() {
    // remove any patterns that no longer exist or are now hidden from the user

    // the patterns the user has permission to see
    var my_patterns = Patterns.find({
      $or: [
        { private: {$ne: true} },
        { created_by: Meteor.userId() }
      ]
    }).map(function(pattern) {return pattern._id});

    Recent_Patterns.remove({pattern_id: {$nin:my_patterns}});
  },
  set_current_weave_row: function(pattern_id, index) {
    check(pattern_id, String);
    check(index, Number);

    if (!Meteor.userId())
      return;

    if (index < 1)
      return;

    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var number_of_rows = pattern.number_of_rows;

    if (index > number_of_rows)
      return;

    Recent_Patterns.update({ $and: [{pattern_id: pattern_id}, {user_id:Meteor.userId()}]}, { $set: {current_weave_row: index}});

    return;
  },
  ///////////////////////////////
  // Edit pattern properties
  update_pattern_name: function(pattern_id, name)
  {
    check(pattern_id, String);
    check(name, String);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    if (name == "")
        return;

    if (typeof name === "undefined")
        return;

    Patterns.update({_id: pattern_id}, {$set: {name: name}});
  },
  update_pattern_description: function(pattern_id, description)
  {
    check(pattern_id, String);
    check(description, String);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    if (typeof description === "undefined")
        return;

    Patterns.update({_id: pattern_id}, {$set: {description: description}});
  },
  add_weaving_row: function(pattern_id, position, style) {
    check(pattern_id, String);
    check(position, Number);
    check(style, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    var number_of_tablets = pattern.number_of_tablets;
    var number_of_rows = pattern.number_of_rows;

    if (number_of_rows == 0)
      position = 1;

    if (position == -1) // -1 is a shorthand meaning add row at end
      var position = number_of_rows+1;

    // increment row number of subsequent rows to make space
    Weaving.find({pattern_id: pattern_id}).forEach(function(cell){ 

      if (cell.row >= position)
      {
        var new_row_value = cell.row + 1;
        var cell_id = cell._id;
        Weaving.update({_id: cell_id}, {$set: {row: new_row_value}});
      }
    });

    // add new row
    for (var i=0; i<number_of_tablets; i++)
    {
      Weaving.insert({
        pattern_id: pattern_id,
        tablet: i+1,
        row: position,
        style: style
      });
    }

    // Increment the number of rows
    Patterns.update({_id: pattern_id}, {$inc: {number_of_rows: 1}});

  },
  add_tablet: function (pattern_id, position, style) {
    check(pattern_id, String);
    check(position, Number);
    check(style, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    var number_of_tablets = pattern.number_of_tablets;
    var number_of_rows = pattern.number_of_rows;

    if (position == -1) // -1 is a shorthand meaning add tablet at end
      var position = number_of_tablets+1;

    // add tablet to weaving
    // increment tablet number of subsequent weaving tablets to make space
    Weaving.find({pattern_id: pattern_id}).forEach(function(cell){ 
      if (cell.tablet >= position)
      {
        var new_tablet_value = cell.tablet + 1;
        var cell_id = cell._id;
        Weaving.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });

    // add new tablet to weaving
    for (var i=0; i<number_of_rows; i++)
    {
      Weaving.insert({
        pattern_id: pattern_id,
        tablet: position,
        row: i+1,
        style: style
      });
    }

    // add tablet to threading
    // increment tablet number of subsequent threading tablets to make space
    Threading.find({pattern_id: pattern_id}).forEach(function(cell){ 

      if (cell.tablet >= position)
      {
        var new_tablet_value = cell.tablet + 1;
        var cell_id = cell._id;
        Threading.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });

    // add new tablet to threading
    for (var i=0; i<4; i++)
    {
      Threading.insert({
        pattern_id: pattern_id,
        tablet: position,
        hole: i+1,
        style: style
      });
    }

    // add tablet to orientation
    // increment tablet number of subsequent orientation tablets to make space
    Orientation.find({pattern_id: pattern_id}).forEach(function(cell){ 

      if (cell.tablet >= position)
      {
        var new_tablet_value = cell.tablet + 1;
        var cell_id = cell._id;
        Orientation.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });

    Orientation.insert({
      pattern_id: pattern_id,
      tablet: position,
      orientation: "S"
    });

    // Increment the number of tablets
    Patterns.update({_id: pattern_id}, {$inc: {number_of_tablets: 1}});
  },
  remove_row: function(pattern_id, position) {
    check(pattern_id, String);
    check(position, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    // is there more than 1 row?
    var second_tablet = Weaving.findOne({ $and: [{pattern_id: pattern_id}, {row: 2}]});
    if (typeof second_tablet === "undefined") {
      console.log("remove_tablet in methods.js is attempting to remove the only row");
      return;
    }

    // remove all cells in the row
    Weaving.remove({ $and: [{pattern_id: pattern_id}, {row: position}]});

    // decrement row number of subsequent rows to to fill the gap
    Weaving.find({pattern_id: pattern_id}).forEach(function(cell){ 
      if (cell.row > position)
      {
        var new_row_value = cell.row - 1;
        var cell_id = cell._id;
        Weaving.update({_id: cell_id}, {$set: {row: new_row_value}});
      }
    });

    // Decrement the number of rows
    Patterns.update({_id: pattern_id}, {$inc: {number_of_rows: -1}});
  },
  remove_tablet: function(pattern_id, position) {
    check(pattern_id, String);
    check(position, Number);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    // is there more than 1 tablet?
    var second_tablet = Weaving.findOne({ $and: [{pattern_id: pattern_id}, {tablet: 2}]});
    if (typeof second_tablet === "undefined") {
      console.log("remove_tablet in methods.js is attempting to remove the only tablet");
      return;
    }

    // Remove tablet from Weaving collection
    // remove all cells in the row
    Weaving.remove({$and: [{pattern_id: pattern_id}, {tablet: position}]});

    // decrement tablet number of subsequent rows to to fill the gap
    Weaving.find({pattern_id: pattern_id}).forEach(function(cell){ 
      if (cell.tablet > position)
      {
        var new_tablet_value = cell.tablet - 1;
        var cell_id = cell._id;
        Weaving.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });

    // Remove tablet from Threading collection
    // remove all cells in the row
    Threading.remove({$and: [{pattern_id: pattern_id}, {tablet: position}]});

    // decrement tablet number of subsequent rows to to fill the gap
    Threading.find({pattern_id: pattern_id}).forEach(function(cell){ 
      if (cell.tablet > position)
      {
        var new_tablet_value = cell.tablet - 1;
        var cell_id = cell._id;
        Threading.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });
    
    // Remove tablet from Orientation collection
    // remove all cells in the row
    Orientation.remove({$and: [{pattern_id: pattern_id}, {tablet: position}]});

    // decrement tablet number of subsequent rows to to fill the gap
    Orientation.find({pattern_id: pattern_id}).forEach(function(cell){ 
      if (cell.tablet > position)
      {
        var new_tablet_value = cell.tablet - 1;
        var cell_id = cell._id;
        Orientation.update({_id: cell_id}, {$set: {tablet: new_tablet_value}});
      }
    });

    // Decrement the number of tablets
    Patterns.update({_id: pattern_id}, {$inc: {number_of_tablets: -1}});
  },
  toggle_orientation: function(pattern_id, orientation_id) {
    // orientation_id is the _id of the tablet's corresponding document in the Orientation collection
    check(pattern_id, String);
    check(orientation_id, String);

    var pattern = Patterns.findOne({_id: pattern_id});

    if (pattern.created_by != Meteor.userId()) {
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized");
    }

    var tablet = Orientation.findOne({_id: orientation_id});

    var orientation = "S";
    if (tablet.orientation == "S")
    {
      orientation = "Z";
    }
    Orientation.update({_id: orientation_id}, { $set: {orientation: orientation }});
  }
});
