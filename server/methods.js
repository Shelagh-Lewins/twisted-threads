Meteor.methods({
  //////////////////////
  // Pattern management
  show_pattern_tags: function() {
    // for internal use only
    console.log("All tags " + Meteor.tags.find().fetch().map(function(tag) {return tag.name}));
  },
  can_create_pattern: function() {
    if (!Meteor.userId())
      return false;

    var count = Patterns.find({created_by: Meteor.userId()}).count();

    if (Roles.userIsInRole( Meteor.userId(), 'verified', 'users' ))
    {
      if (Roles.userIsInRole( Meteor.userId(), 'premium', 'users' ))
      {
        if (count < Meteor.settings.public.max_patterns_per_user.premium)
          return true;

        else
          return false;
      }
      else
      {
        if (count < Meteor.settings.public.max_patterns_per_user.verified)
          return true;

        else
          return false;
      }
    }
    // if the user's email address is not verified, they can only create 1 pattern
    else
    {
      if (count < Meteor.settings.public.max_patterns_per_user.default)
        return true;

      else 
        return false;
    }
  },/*
  // this is no longer used because the file read seemed to fail sometimes. The function is left in as a reference for reading a JSON file.
  read_default_pattern: function() {
    // return the default_turning_pattern.json
    if (!Meteor.userId()) {
      // Only logged in users can create patterns
      throw new Meteor.Error("not-authorized", "You must be signed in to read default pattern data");
    }

    try {
      var data = JSON.parse(Assets.getText("default_pattern_data.json"));
    return data;
      
      
    }
    catch(e)
    {
      //return -1;
      throw new Meteor.Error("file-load-failed", "File load error in read_default_pattern");
    }
  },*/
  new_pattern_from_json: function(options) {
    // options
    /* {
      name: "pattern name", //optional
      data: json data object,
    } */

    // if number_of_tablets and number_of_rows are both specified, a blank pattern will be built with style 1 for all weaving and threading cells
    //console.log('new pattern from JSON 1');
    //console.log(`options ${JSON.stringify(options)}`);
    check(options, {
      edit_mode: Match.Optional(String),
      number_of_tablets: Match.Optional(String),
      number_of_rows: Match.Optional(String),
      name: Match.Optional(String),
      data: Object,
      twill_direction: Match.Optional(String),
    });

    if (!Meteor.isServer) // minimongo cannot simulate loading data with Assets
        return;

    if (!Meteor.userId()) {
      // Only logged in users can create patterns
      throw new Meteor.Error("not-authorized", "You must be signed in to create a new pattern");
    }

    var result = Meteor.call('can_create_pattern');
    if (!result)
      throw new Meteor.Error("not-authorized", "You may not create any more patterns");

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
        //return -1;
        throw new Meteor.Error("file-load-failed", "File load error in new_pattern_from_json");
      }
    }
    else
    {
      //return -1;
      throw new Meteor.Error("file-load-failed", "File load error in new_pattern_from_json");
    }

    // check version
    var version = [0,0];
    if (typeof data.version !== "undefined")
    {
      var split_version = data.version.split("."); // [main, subsidiary] e.g. 2.1
      if (typeof split_version[0] !== "undefined")
      {
        version[0] = parseInt(split_version[0]);

        if (typeof split_version[1] !== "undefined")
        {
          version[1] = parseInt(split_version[1]);
        }
      } 
    }

    // edit_mode "freehand" (default), "simulation" or "broken_twill"
    if((options.edit_mode == "") || (typeof options.edit_mode === "undefined"))
      options.edit_mode = "freehand"; // earlier data version

    if((data.edit_mode == "") || (typeof data.edit_mode === "undefined"))
      data.edit_mode = options.edit_mode;

    // Numbers of rows and tablets
    // have both rows and tablets been specified as positive integers less than 100?
    var build_new = true; // whether to build a blank pattern using a specified number of tablets and rows
    if ((typeof options.number_of_tablets !== "undefined") && (typeof options.number_of_rows !== "undefined"))
    {
      var tablets = parseInt(options.number_of_tablets);

      if (isNaN(tablets))
        build_new = false;

      else if ((tablets <1) || (tablets > 100))
        build_new = false;

      var rows = parseInt(options.number_of_rows);

      if ((rows <1) || (rows > 100))
        if (options.edit_mode != "simulation") // simulation pattern builds its own weaving chart
          build_new = false;
    }
    else
    {
      build_new = false;
    }

    if (build_new)
    {
      // build pattern data
      switch(options.edit_mode) {
        case "freehand":
          data.preview_rotation = "left";
          break;

        case "simulation":
          data.preview_rotation = "up";
          break;

        case "broken_twill":
          data.preview_rotation = "up";
          break;
      }

      // weaving
      data.weaving = new Array();

      for (var i=0; i<options.number_of_rows; i++)
      {
        data.weaving[i] = new Array();
        for (var j=0; j<options.number_of_tablets; j++)
        {
          data.weaving[i][j] = ((j % 2) == 0) ? 5 :6;
        }
      }

      if (options.edit_mode == "broken_twill") {
        data.weaving_start_row = 1;
      }

      // threading
      data.threading = new Array(options.number_of_rows);

      // default threading is style 1 for background, style 2 for foreground
      const broken_twill_threading = [
        [2,2,1,2],
        [2,1,1,1],
        [1,1,2,1],
        [1,2,2,2]
      ];

      for (var i=0; i<4; i++)
      {
        data.threading[i] = new Array(options.number_of_tablets);
        for (var j=0; j<options.number_of_tablets; j++)
        {
          if (data.edit_mode == "freehand")
            data.threading[i][j] = ((j % 2) == 0) ? 5 :6; // manually set threading to show warp direction

          else if (data.edit_mode == "simulation")
            data.threading[i][j] = 2; // plain yellow in default pattern

          // two light, two dark, offset along tablets
          else if (data.edit_mode == "broken_twill")
          {
            data.threading[i][j] = broken_twill_threading[i][j%4];
          }
        }
      }

      // orientation
      data.orientation = new Array(number_of_tablets);
      for (var i=0; i<options.number_of_tablets; i++)
      {
        if (data.edit_mode == "broken_twill")
          data.orientation[i] = "S";
        else
         data.orientation[i] = (i % 2 == 0) ? "S" : "Z";
      }
    }
    else if (typeof data.threading[0] === "undefined") // no rows of threading have been defined
    {
      throw new Meteor.Error("no-threading-data", "error creating pattern from JSON. No threading data");
    }

    var number_of_rows = data.weaving.length;
    var number_of_tablets = data.threading[0].length; // there may be no weaving rows but there must be threading

    // try to prevent huge patterns that would fill up the database
    if (number_of_rows > Meteor.settings.private.max_pattern_rows)
      throw new Meteor.Error("too-many-rows", "error creating pattern from JSON. Too many rows.");

    if (number_of_tablets > Meteor.settings.private.max_pattern_tablets)
      throw new Meteor.Error("too-many-tablets", "error creating pattern from JSON. Too many tablets.");

    if(options.name == "")
      options.name = Meteor.my_params.default_pattern_name;

    data.name = options.name;

    // tags
    if (typeof data.tags === "undefined") {
      data.tags = [];
    }

    if (data.edit_mode == "broken_twill") {
      data.tags.push('3/1 broken twill');
    }

    var description ="";
    if (typeof data.description !== "undefined")
      description = data.description;

    var weaving_notes = "";
    if (typeof data.weaving_notes !== "undefined")
      weaving_notes = data.weaving_notes;

    var weft_color = Meteor.settings.private.default_weft_color;
    if (typeof data.weft_color !== "undefined")
      weft_color = data.weft_color;

    if (typeof data.preview_rotation === "undefined")
      data.preview_rotation = "left";

    var threading_notes = "";
    if (typeof data.threading_notes !== "undefined")
      threading_notes = data.threading_notes;

    var pattern_id = Patterns.insert({
      name: data.name,
      edit_mode: data.edit_mode,
      description: description,
      weaving_notes: weaving_notes,
      preview_rotation: data.preview_rotation,
      weft_color: weft_color,
      threading_notes: threading_notes,
      private: true, // patterns are private by default so the user can edit them before revealing them to the world
      number_of_rows: number_of_rows,
      number_of_tablets: number_of_tablets,
      created_at: moment().valueOf(),            // current time
      created_by: Meteor.userId(),           // _id of logged in user
      created_by_username: Meteor.user().username  // username of logged in user
    });

    if (data.weaving_start_row) {
    Patterns.update({_id: pattern_id}, {$set: {weaving_start_row: data.weaving_start_row}});
    }

    // Tags
    for (var i=0; i<data.tags.length; i++)
    {
      Patterns.addTag(data.tags[i], { _id: pattern_id });
    }

    // Styles
    var styles_array = [];

    if (data.edit_mode == "simulation" || data.edit_mode == "broken_twill") // palette shows 7 regular styles for threading. The other 32 are used to automatically build the weaving chart: 4 per threading styles to show S/Z and turn forwards, backwards
    // in 3/1 broken twill only two thread colours may be set but it's easier to stick with the same styles
    {
      var styles;

      if (typeof data.simulation_styles !== "undefined")
        styles = data.simulation_styles; // new pattern
      else if (typeof data.styles !== "undefined")
        styles = data.styles; // copy of existing pattern JSON
      else
        throw new Meteor.Error("no-styles-data", "error creating pattern from JSON. No styles data.");

      for (var i=0; i<styles.length; i++)
      {
        styles_array[i] = styles[i];
      }
    }
    else if (data.edit_mode == "freehand") // 32 visible styles for manually drawing threading and weaving charts
    {
      for (var i=0; i<32; i++) // create 32 styles
      {
        styles_array[i] = data.styles[i];

        // version 1 has style.backward_stroke, style.forward_stroke
        // convert to 2+
        // style.stroke "forward" "backward" "none (other values possible in 2+)
        
        if (data.styles[i].backward_stroke)
          data.styles[i].warp = "backward";
          
        if (data.styles[i].forward_stroke) // if both defined, choose forward
          data.styles[i].warp = "forward";
          
        delete data.styles[i].backward_stroke;
        delete data.styles[i].forward_stroke;

        if (typeof data.styles[i].warp === "undefined")
          data.styles[i].warp = "none";
      }
    }


    Patterns.update({_id: pattern_id}, {$set: {styles: JSON.stringify(styles_array)}});

    // Special styles
    var special_styles_array = [];
    if (typeof data.special_styles === "undefined")
      data.special_styles = [];

    for (var i=0; i<Meteor.my_params.special_styles_number; i++)
    {
      special_styles_array[i] = data.special_styles[i];
    }
    Patterns.update({_id: pattern_id}, {$set: {special_styles: JSON.stringify(special_styles_array)}});

    // Pattern
    var weaving = new Array(number_of_rows);
    for (var i=0; i<number_of_rows; i++)
    {
      weaving[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        weaving[i][j] = data.weaving[i][j];
      }
    }

    Patterns.update({_id: pattern_id}, {$set: {weaving: JSON.stringify(weaving)}});

    //////////////////////////////
    if (data.edit_mode == "simulation")
    {
      // auto or manual. New patterns default to "freehand". Patterns from JSON may be either.
      if((data.simulation_mode == "") || (typeof data.simulation_mode === "undefined"))
        data.simulation_mode = "auto";

      Patterns.update({_id: pattern_id}, {$set: {simulation_mode: data.simulation_mode}});

      // auto and manual turn sequences exist so the user can switch between them without losing data
      // track current rotation of each tablet
      if(typeof data.position_of_A === "undefined")
      {
        data.position_of_A = new Array();
        for (var i=0; i<number_of_tablets; i++)
        {
          data.position_of_A.push(0);
        }
      }

      Patterns.update({_id: pattern_id}, {$set: {position_of_A: JSON.stringify(data.position_of_A)}});

      // auto_turn_sequence e.g. FFFFBBBB
      if(typeof data.auto_turn_sequence === "undefined")
        data.auto_turn_sequence = ["F","F","F","F","B","B","B","B"]; // default to 4 forward, 4 back

      Patterns.update({_id: pattern_id}, {$set: {auto_turn_sequence: data.auto_turn_sequence}});

      // manual_weaving_turns, 4 packs each tablet turned individually
      // create row 0 which is never woven, it is a default and working row
      // actual weaving begins with row 1, 2...
      if((data.manual_weaving_turns == "") || (typeof data.manual_weaving_turns === "undefined"))
        data.manual_weaving_turns = [];

        var new_turn = {
          tablets: [], // for each tablet, the pack number
          packs: [] // turning info for each pack
        }

        for (var i=1; i<=Meteor.my_params.number_of_packs; i++)
        {
          var pack = {
            pack_number: i,
            number_of_turns: 1
          }
          if (i == 2) {
            pack.direction = "B"; // suggested usage is pack 1 F, pack 2 B. Pack 3 F for borders.
          } else {
            pack.direction = "F";
          }
          new_turn.packs.push(pack);
        }
          
        for (var j=0; j<number_of_tablets; j++)
        {
          new_turn.tablets.push(1); // all tablets start in pack 1
        }

        data.manual_weaving_turns[0] = new_turn;
        Patterns.update({_id: pattern_id}, {$set: {manual_weaving_turns: JSON.stringify(data.manual_weaving_turns)}});

      /*
      4 packs, each tablet in one pack
      for each pack, each pick: turn direction, number of turns 0,1,2,3
      export JSON, import JSON

      use this to build weaving chart dynamically
      */
    } else if (data.edit_mode == "broken_twill") {

      if (typeof options.twill_direction !== "undefined")
      {
        // new pattern
        var twill_direction = options.twill_direction;

        // 3/1 twill must have an even number of rows
        if (options.number_of_rows % 2 == 1)
          throw new Meteor.Error("odd-twill-rows", "error creating pattern from JSON. 3/1 broken twill pattern must have even number of rows");

        var twill_pattern_chart = [];
        // corresponds to Data in GTT pattern. This is the chart showing the two-colour design.

        var twill_change_chart = [];
        // corresponds to LongFloats in GTT pattern. This is the chart showing 'backsteps' in the turning schedule to adjust for smooth diagonal edges.

        // set up a plain chart for each, this will give just background twill
        // charts have an extra row at the end
        // this extra row is not shown in preview or weaving chart but is used to determine the last even row
        for (var i=0; i<(options.number_of_rows / 2) + 1; i++)
        {
          twill_pattern_chart[i] = new Array();
          twill_change_chart[i] = new Array();

          for (var j=0; j<options.number_of_tablets; j++)
          {
            twill_pattern_chart[i][j] = ".";
            twill_change_chart[i][j] = ".";
          }
        }
      }
      else if (typeof options.data.twill_direction !== "undefined")
      {
        // loaded from JSON file
        var twill_direction = options.data.twill_direction;

        var twill_pattern_chart = JSON.parse(options.data.twill_pattern_chart);
        // corresponds to Data in GTT pattern. This is the chart showing the two-colour design.

        var twill_change_chart = JSON.parse(options.data.twill_change_chart);
        // corresponds to LongFloats in GTT pattern. This is the chart showing 'backsteps' in the turning schedule to adjust for smooth diagonal edges.
      }
      else
      {
        throw new Meteor.Error("no-twill-direction", "error creating pattern from JSON. No twill direction for 3/1 broken twill pattern");
      }

      Patterns.update({_id: pattern_id}, {$set: {twill_direction: twill_direction}});
      Patterns.update({_id: pattern_id}, {$set: {twill_pattern_chart: JSON.stringify(twill_pattern_chart)}});
      Patterns.update({_id: pattern_id}, {$set: {twill_change_chart: JSON.stringify(twill_change_chart)}});
    }
    /////////////////////////////////

    // Threading
    var threading = new Array(4);
    for (var i=0; i< 4; i++)
    {
      threading[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        threading[i][j] = data.threading[i][j];
      }
    }

    Patterns.update({_id: pattern_id}, {$set: {threading: JSON.stringify(threading)}});

    // Orientation
    var orientation = new Array(number_of_tablets);
    for (var i=0; i<number_of_tablets; i++)
    {
      orientation[i] = data.orientation[i];
    }

    // count public patterns as a safety check (new patterns are private by default so it shouldn't make any difference).
    Meteor.call("count_public_patterns", Meteor.userId());

    Patterns.update({_id: pattern_id}, {$set: {orientation: JSON.stringify(orientation)}});
    var pattern = Patterns.findOne({_id: pattern_id});

    ///////////////////////////////////
    //
    ///////////////////////////////////

    return pattern_id;
  },
  /////////////////////////////////////
  // New: create collection data from an existing dynamic arrays
  /////////////////////////////////////
  create_new_data_from_arrays: function(pattern_id, weaving_data) {
    check(pattern_id, String);
    check(weaving_data, Array);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only create data for patterns that you created");
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

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove patterns that you created");

    // remove from Patterns collection
    Patterns.remove(pattern_id);

    // remove from Recent Patterns list
    var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

    var index = -1;
    for (var i=0; i < recent_patterns.length; i++)
    {
      if (recent_patterns[i].pattern_id == pattern_id)
      {
        index = i;
        break;
      }
    }

    if (index > -1) {
      recent_patterns.splice(index, 1);
    }

    var update = {};
    update["profile.recent_patterns"] = recent_patterns;

    Meteor.users.update({_id: Meteor.userId()}, {$set: update});

    // update count of public patterns
    Meteor.call("count_public_patterns", Meteor.userId());

    // remove associated images from AWS
    Images.find({used_by: pattern_id}).map(function(image) {
      Meteor.call("remove_image", image._id);
    });

    // update collection that lists associated images
    Images.remove({used_by: pattern_id});
  },
  set_private: function (pattern_id, set_to_private) {
    check(pattern_id, String);
    check(set_to_private, Boolean);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only change the privacy on a pattern you created");
 
    Patterns.update(pattern_id, { $set: { private: set_to_private } });
    Meteor.call("count_public_patterns", pattern.created_by);
  },
  count_public_patterns: function (user_id) {
    // maintain a count of the user's public patterns, so we can easily see which users have public patterns
    var num = Patterns.find({
    $and: [
      { private: {$ne: true} },
      { created_by: user_id }
    ]}).count();

    var profile = Meteor.users.findOne({ _id: user_id}).profile;
    if (typeof profile === "undefined")
      profile = {};
    
    profile["public_patterns_count"] = num;

    Meteor.users.update({_id: user_id}, {$set: {profile: profile}});
  },
  ///////////////////////////////
  // Stringify pattern data and save it
  save_weaving_to_db: function(pattern_id, text, number_of_rows, number_of_tablets)
  {
    check(pattern_id, String);
    check(text, String);
    check(number_of_rows, Number);
    check(number_of_tablets, Number);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // try to prevent huge patterns that would fill up the database
    if (number_of_rows > Meteor.settings.private.max_pattern_rows)
      throw new Meteor.Error("too-many-rows", "error saving pattern. Too many rows.");

    if (number_of_tablets > Meteor.settings.private.max_pattern_tablets)
      throw new Meteor.Error("too-many-tablets", "error saving pattern. Too many tablets.");

    // Save the individual cell data
    // var pattern = Patterns.findOne({_id: pattern_id}); // TODO remove

    Patterns.update({_id: pattern_id}, {$set: { weaving: text}});

    // Record the number of rows
    Patterns.update({_id: pattern_id}, {$set: {number_of_rows: number_of_rows}});

    // Record the number of tablets
    Patterns.update({_id: pattern_id}, {$set: {number_of_tablets: number_of_tablets}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_number_of_tablets: function(pattern_id, number_of_tablets)
  {
    check(pattern_id, String);
    check(number_of_tablets, Number);

    Patterns.update({_id: pattern_id}, {$set: {number_of_tablets: number_of_tablets}});
  },
  save_preview_as_text: function(pattern_id, data)
  {
    check(pattern_id, String);
    check(data, String);

    Patterns.update({_id: pattern_id}, {$set: {auto_preview: data}});
  },
  rotate_preview: function(pattern_id)
  {
    check(pattern_id, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, preview_rotation: 1 }});

    if (typeof pattern.preview_rotation === "undefined") // old pattern, needs value setting
    {
      Patterns.update({_id: pattern_id}, {$set: {preview_rotation: "left"}});
      return;
    }

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit a pattern you created");      

    if (typeof pattern.preview_rotation === "undefined")
      Patterns.update({_id: pattern_id}, {$set: {preview_rotation: "left"}});

    switch(pattern.preview_rotation)
    {
      case "left":
        Patterns.update({_id: pattern_id}, {$set: {preview_rotation: "right"}});
        break;

      case "right":
        Patterns.update({_id: pattern_id}, {$set: {preview_rotation: "left"}});
        break;

      default:
        Patterns.update({_id: pattern_id}, {$set: {preview_rotation: "left"}});
    }
  },
  set_preview_orientation: function(pattern_id, rotation) {
    check(pattern_id, String);
    check(rotation, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, preview_rotation: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit a pattern you created");

    Patterns.update({_id: pattern_id}, {$set: {preview_rotation: rotation}});

  },
  save_threading_to_db: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { threading: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);

    return;
  },
  save_weft_color_to_db: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { weft_color: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_orientation_to_db: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { orientation: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_styles_to_db: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit styles in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { styles: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_manual_weaving_turns: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, text);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit maual weaving turns in a pattern you created");

     Patterns.update({_id: pattern_id}, {$set: {manual_weaving_turns: text}});   
  },
  restore_pattern: function(data)
  {
    check(data, Object);

    var pattern = Patterns.findOne({_id: data._id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only restore a pattern you created");

    // reconstruct the pattern according to the data, e.g. for undo
    Meteor.call('save_weaving_to_db', data._id, JSON.stringify(data.weaving), data.number_of_rows, data.number_of_tablets);
    Meteor.call('save_threading_to_db', data._id, JSON.stringify(data.threading));
    Meteor.call('save_orientation_to_db', data._id, JSON.stringify(data.orientation));
    Meteor.call('save_styles_to_db', data._id, JSON.stringify(data.styles));
    Patterns.update({_id: data._id}, {$unset: {auto_preview: ""}}); // preview must be re-read from the HTML after it has been built
    return;
  },
  update_after_tablet_change: function(data) // required to restore reactivity after tablets have been added or removed
  // it seems to be necessary to change the database
  {
    check(data, Object);

    Meteor.call('save_weaving_to_db', data._id, JSON.stringify(data.weaving), data.number_of_rows, data.number_of_tablets);

    var pattern = Patterns.findOne({_id: data._id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only restore a pattern you created");

    return;
  },
  save_pattern_edit_time: function(pattern_id)
  {
    check(pattern_id, String);

    Patterns.update({_id: pattern_id}, {$set: {pattern_edited_at: moment().valueOf()}});
  },
  ///////////////////////////////
  // Edit other pattern properties
  toggle_hole_handedness: function(pattern_id)
  {
    check(pattern_id, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, hole_handedness: 1}});

    if (pattern.created_by != Meteor.userId())
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized", "You can only edit hole handedness for a pattern you created");

    // default is clockwise if not otherwise specified
    var new_value = "anticlockwise";
    if (pattern.hole_handedness == "anticlockwise")
      new_value = "clockwise";

    Patterns.update({_id: pattern_id}, {$set: {hole_handedness: new_value}});
  },
  add_pattern_thumbnail: function(pattern_id, fileObj)
  {
    console.log("add_pattern_thumbnail");
    console.log("fileObj keys " + Object.keys(fileObj));
  },
  ///////////////////////////////
  // Edit styles
  set_pattern_cell_style: function(pattern_id, row, tablet, new_style)
  {
    check(pattern_id, String);
    check(row, Number);
    check(tablet, Number);
    check(new_style, Number);

    if (Meteor.isServer)
    {
      var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

      // This construction allows variable properties of the document to be set
      var update = {};
      update["weaving." + row + "." + tablet + ".style"] = new_style;
      Patterns.update({_id: pattern_id}, {$set: update});
    }
  },
  set_threading_cell_style: function(pattern_id, hole, tablet, new_style)
  {
    check(pattern_id, String);
    check(hole, Number);
    check(tablet, Number);
    check(new_style, Number);

    if (Meteor.isServer)
    {
      var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId()) {
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit threading in a pattern you created");
      }

      // This construction allows variable properties of the document to be set
      var update = {};
      update["threading." + hole + "." + tablet + ".style"] = new_style;
      Patterns.update({_id: pattern_id}, {$set: update});
    }
  },

  //////////////////////////////////////
  // Simulation patterns
  update_simulation_mode: function(pattern_id, simulation_mode) {
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, simulation_mode: 1}});

    if (pattern.created_by != Meteor.userId())
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized", "You can only update simulation mode for a pattern you created");

    if (pattern.simulation_mode == simulation_mode)
      return;

    Patterns.update({_id: pattern_id}, {$set: {simulation_mode: simulation_mode}});

    Patterns.update({_id: pattern_id}, {$set: {weaving: "[]"}});
    Patterns.update({_id: pattern_id}, {$set: {number_of_rows: 0}});

  },
  //////////////////////////////////
  // Manual simulation
  update_auto_weaving: function(pattern_id, data)
  {
    check(data, Object);

    Patterns.update({_id: pattern_id}, {$set: {weaving: data.weaving}});
      Patterns.update({_id: pattern_id}, {$set: {number_of_rows: data.number_of_rows}});
      Patterns.update({_id: pattern_id}, {$set: {position_of_A: data.position_of_A}});
      Patterns.update({_id: pattern_id}, {$set: {auto_turn_threads: data.auto_turn_threads}});
  },
  update_manual_weaving: function(pattern_id, data)
  {
    check(pattern_id, String);
    check(data, Object);

    Patterns.update({_id: pattern_id}, {$set: {position_of_A: JSON.stringify(data.position_of_A)}});
    Patterns.update({_id: pattern_id}, {$set: {weaving: JSON.stringify(data.weaving)}});
    Patterns.update({_id: pattern_id}, {$set: {number_of_rows: data.weaving.length}});
    Patterns.update({_id: pattern_id}, {$set: {manual_weaving_turns: JSON.stringify(data.manual_weaving_turns)}});
    Patterns.update({_id: pattern_id}, {$set: {manual_weaving_threads: data.manual_weaving_threads}});
  },
  /////////////////////////////
  // auto simulation pattern UI
  set_auto_number_of_turns: function(pattern_id, auto_turn_sequence)
  {
    check(pattern_id, String);
    check(auto_turn_sequence, [String]);

    var num_auto_turns = auto_turn_sequence.length

    if ((num_auto_turns < 1) || (num_auto_turns > Meteor.my_params.max_auto_turns))
      throw new Meteor.Error("not-valid", "Number of turns exceeds the allowed maximum");

    if (num_auto_turns < 1)
        throw new Meteor.Error("not-valid", "You cannot have 0 turns in the sequence");

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, auto_turn_sequence: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only update number of turns for a pattern you created");

      Patterns.update({_id: pattern_id}, {$set: {auto_turn_sequence: auto_turn_sequence}});
  },
  toggle_turn_direction: function(pattern_id, turn_number) {
    // toggle direction of a turn of auto turning, for simulation pattern
    check(pattern_id, String);
    check(turn_number, Number);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, auto_turn_sequence: 1}});

    if (pattern.created_by != Meteor.userId())
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized", "You can only update turn direction for a pattern you created");

    var auto_turn_sequence = pattern.auto_turn_sequence;
    var direction = auto_turn_sequence[turn_number - 1];

    if (direction == "F")
      direction = "B";

    else
      direction = "F";

    auto_turn_sequence[turn_number - 1] = direction;

    Patterns.update({_id: pattern_id}, {$set: {auto_turn_sequence: auto_turn_sequence}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  //////////////////////////////////////
  // Broken twill
  update_twill_pattern_chart: function(pattern_id, data)
  {
    check(pattern_id, String);
    check(data, Object);

    Patterns.update({_id: pattern_id}, {$set: {twill_pattern_chart: JSON.stringify(data.twill_pattern_chart)}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  update_twill_change_chart: function(pattern_id, data)
  {
    check(pattern_id, String);
    check(data, Object);

    Patterns.update({_id: pattern_id}, {$set: {twill_change_chart: JSON.stringify(data.twill_change_chart)}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  update_twill_charts: function(pattern_id, data, number_of_rows, number_of_tablets) {
    check(pattern_id, String);
    check(data, Object);
    check(number_of_rows, Number);
    check(number_of_tablets, Number);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // try to prevent huge patterns that would fill up the database
    if (number_of_rows > Meteor.settings.private.max_pattern_rows)
      throw new Meteor.Error("too-many-rows", "error saving pattern. Too many rows.");

    if (number_of_tablets > Meteor.settings.private.max_pattern_tablets)
      throw new Meteor.Error("too-many-tablets", "error saving pattern. Too many tablets.");

    Patterns.update({_id: pattern_id}, {$set: {twill_pattern_chart: JSON.stringify(data.twill_pattern_chart)}});
    Patterns.update({_id: pattern_id}, {$set: {twill_change_chart: JSON.stringify(data.twill_change_chart)}});

    if (data.orientation) {
      Patterns.update({_id: pattern_id}, {$set: {orientation: JSON.stringify(data.orientation)}});
    }

    if (data.threading) {
      Patterns.update({_id: pattern_id}, {$set: {threading: JSON.stringify(data.threading)}});
    }

    // copied from save_weaving_to_db
    Patterns.update({_id: pattern_id}, {$set: { weaving: JSON.stringify(data.weaving)}});

    // Record the number of rows
    Patterns.update({_id: pattern_id}, {$set: {number_of_rows: number_of_rows}});

    // Record the number of tablets
    Patterns.update({_id: pattern_id}, {$set: {number_of_tablets: number_of_tablets}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);

  },
  set_weaving_start_row: function(pattern_id, row_number) {
    check(pattern_id, String);
    check(row_number, Number);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, edit_mode: 1, weaving_start_row: 1, number_of_rows: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit twill start row in a pattern you created");

    if (pattern.edit_mode !== "broken_twill")
      throw new Meteor.Error("not-authorized", "You can only set twill start row in a broken twill pattern");

    row_number = Math.floor(row_number);

    if (row_number < 1)
      throw new Meteor.Error("not-authorized", "Broken twill start row must be at least 1");

    if (row_number > pattern.number_of_rows)
      throw new Meteor.Error("not-authorized", "Broken twill start row cannot be greater than number of rows");

    // Record the number of tablets
    Patterns.update({_id: pattern_id}, {$set: {weaving_start_row: row_number}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  //////////////////////////////////////
  // Recent patterns
  add_to_recent_patterns: function(pattern_id) {
    // Add a pattern to the Recent_Patterns list in the user's profile
    // If it's already in the list, update the accessed_at time
    check(pattern_id, String);

    if (!Meteor.userId()) // user is not signed in
      return;

    if (typeof Patterns.findOne({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}) === "undefined")
      return; // the pattern doesn't exist

    // create an empty array if there is no existing list of recent patterns for this user
    var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

    var recent_pattern = {
      pattern_id: pattern_id,
      accessed_at: moment().valueOf(),            // current time
      current_weave_row: 1,
    }

    // is the pattern already in the list?
    var index = -1;
    for (var i=0; i < recent_patterns.length; i++)
    {
      if (recent_patterns[i].pattern_id == pattern_id)
      {
        index = i;
        break;
      }
    }

    // the pattern is not in the list, so add it
    if (index === -1)
    {
      recent_patterns.unshift(recent_pattern);

      // don't store too many patterns
      if (recent_patterns.length > Meteor.my_params.max_recents)
        recent_patterns.pop();
    }
    // the pattern is in the list, so update it
    else {
      // note the current weave row
      var stored_weave_row = recent_patterns[index].current_weave_row;
      if (typeof stored_weave_row === "number")
        recent_pattern.current_weave_row = stored_weave_row;

      // remove the existing occurence of the pattern
      recent_patterns.splice(index, 1);  

      // and add the pattern as the most recent i.e. first element
      recent_patterns.unshift(recent_pattern);
    }

    var update = {};
    update["profile.recent_patterns"] = recent_patterns;

    Meteor.users.update({_id: Meteor.userId()}, {$set: update});
  },
  maintain_recent_patterns: function() {
    // remove any patterns that no longer exist or are now hidden from the user
    var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

    // don't store too many patterns
    recent_patterns = recent_patterns.slice(0, Meteor.my_params.max_recents);

    var update = {};
    update["profile.recent_patterns"] = recent_patterns;

    Meteor.users.update({_id: Meteor.userId()}, {$set: update});
  },
  set_current_weave_row: function(pattern_id, index) {
    check(pattern_id, String);
    check(index, Number);

    if (!Meteor.userId())
      return;

    if (index < 1)
      return;

    var pattern = Patterns.findOne({_id: pattern_id}, { fields: { _id : 1 }});

    if (typeof pattern === "undefined")
      return;

    var number_of_rows = pattern.number_of_rows;

    if (index > number_of_rows)
      return;


    var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

    for (var i=0; i < recent_patterns.length; i++)
    {
      if (recent_patterns[i].pattern_id == pattern_id)
      {
        recent_patterns[i].current_weave_row = index;   
        var update = {};
        update["profile.recent_patterns"] = recent_patterns;
        Meteor.users.update({_id: Meteor.userId()}, {$set: update});   
        break;
      }
    }

    return;
  },
  ///////////////////////////////
  // uploaded images
  // Is there already an image with this key?
  does_image_exist: function(key, cb) {

     // check if the image already exists in the S3 bucket
    var s3 = new AWS.S3({
      accessKeyId: Meteor.settings.private.AWSAccessKeyId,
      secretAccessKey: Meteor.settings.private.AWSSecretAccessKey//,
    });

    var params = {
      Bucket: Meteor.settings.private.AWSBucket, // 'mybucket'
      Key: key // 'images/myimage.jpg'
    };

    var my_fn = Meteor.wrapAsync(s3.headObject, s3);
    var results = my_fn(params, function(err, data) {

      if (err)
      {
       throw new Meteor.Error("object does not exist with key " + key);

      } else
      {
        return data;
      }
    });

    return results;
    // callback doesn't seem to work, results has no data and appears before callback
  },
  // Slingshot has added a new image to Amazon S3. Now log in it the Images collection.
  upload_pattern_image: function(downloadUrl, pattern_id, role, width, height){
    check(downloadUrl, NonEmptyString);
    check(pattern_id, NonEmptyString);
    check(role, NonEmptyString);
    check(width, Number);
    check(height, Number);

    var user = Meteor.user();
    if (!Meteor.userId())
      return;

    if (!user.emails[0].verified)
      throw new Meteor.Error("not-authorized", "You can only upload images if you have a verified email address");

    var pattern = Patterns.findOne({_id: pattern_id}, { fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only upload images for patterns you created"); 
    
    var count = Images.find({ used_by: pattern_id }).count();

    if (Roles.userIsInRole( Meteor.userId(), 'premium', 'users' ))
    {
      if (count >= Meteor.settings.public.max_images_per_pattern.premium)
        throw new Meteor.Error("limit-reached", "You cannot upload any more images for this pattern");
    }
    else
    {
      if (count >= Meteor.settings.public.max_images_per_pattern.verified)
        throw new Meteor.Error("limit-reached", "You cannot upload any more images for this pattern");
    }

    var bucket = Meteor.settings.private.AWSBucket;
    var region = Meteor.settings.public.AWSRegion;

    // Find the key by stripping out the first part of the image url
    var key = downloadUrl.replace('https://' + bucket + ".s3-" + region + '.amazonaws.com/', ''); // used to delete the object from AWS

    if (Images.find({key:key}).count() == 0)
    {
      // add the new object to the Images collection
      var image_id = Images.insert({
          url: downloadUrl,
          key: key,
          created_at: moment().valueOf(),            // current time
          created_by: Meteor.userId(),           // _id of logged in user
          created_by_username: Meteor.user().username,  // username of logged in user
          used_by: pattern_id,
          role: role,
          width: width,
          height: height
       });
      return image_id;
    }
    else
    {
      // uploading a new version of an existing file, just update "created_at"
      var image_id = Images.findOne({key:key}, {fields: {_id:1}});
      Images.update({_id: image_id}, {$set:
        {
          created_at: moment().valueOf()
        }});
    }
  },
  make_preview: function(image_id) {
    check(image_id, NonEmptyString);

    // Does the user have permission to remove this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove an image you uploaded");

    if (image.role == "preview")
      return true;

    else
    {
      var pattern_id = image.used_by;
      try {
        var current_preview_id = Images.findOne({used_by:pattern_id, role:"preview"})._id; // remove any existing preview image
        Images.update({_id:current_preview_id}, {$set: {role:"image"}});
      }
      catch(err) {
        // no existing preview, nothing to do here
      }

      Images.update({_id:image_id}, {$set: {role:"preview"}});
    }
  },
  set_image_dimensions: function(image_id, width, height) {
    check(image_id, NonEmptyString);
    check(width, Number);
    check(height, Number);

    // Does the user have permission to edit this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only edit an image you uploaded");

    // landscape or portrait

    // constrain size

    var new_width = width;
    var new_height = height;

    Images.update({_id: image_id}, {$set: {width: new_width, height: new_height}});

  },
  remove_image: function(image_id) {
    check(image_id, NonEmptyString);

    // Does the user have permission to remove this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove an image you uploaded");

    // check for too many image removals too fast
    var document_id = Meteor.call('get_actions_log');

    var db_document = ActionsLog.findOne({_id: document_id}, {fields: { image_removed: 1, locked: 1 }} );

    var event_log = db_document.image_removed;

    if (db_document.locked)
    throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
  
    var number_of_entries = event_log.length;
    var time_since_last_action = moment().valueOf() - event_log[0];

    // try to detect automated image removes
    // A human shouldn't be able to removes 10 images in 2 seconds
    var last_10_actions_in = event_log[0] - event_log[9];
    if (last_10_actions_in < 2000)
    {
      ActionsLog.update( {_id: document_id}, { locked: true } );
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    }

    var last_5_actions_in = event_log[0] - event_log[4];
      if (last_5_actions_in < 2000)
      {
        // Don't allow another attempt for 5 minutes
        if (time_since_last_action < (60 * 1000 * 5))
          throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");

        // it's been at least 5 mins so consider allowing another image upload
        else
        {
          var previous_5_actions_in = event_log[4] - event_log[9];
          if (previous_5_actions_in < 2000)
          {
            // if the 5 previous actions were in 2 seconds, wait 30 minutes
            // this looks like an automatic process that has tried continually
            if (time_since_last_action < (60 * 1000 * 30 + 4000))
              throw new Meteor.Error("too-many-requests", "Please wait 30 mins before retrying");
          }
        }
      }

      // record the action in the log
      ActionsLog.update( {_id: document_id}, { $push: { image_removed: {
        $each: [moment().valueOf()],
        $position: 0 
      }}} );
  ;
      // remove the oldest log entry if too many stored
      if (number_of_entries > Meteor.settings.private.image_remove_num_to_log)
      {
        ActionsLog.update( {_id: document_id}, { $pop: { image_removed: 1 }} );
      }

    var s3 = new AWS.S3({
      accessKeyId: Meteor.settings.private.AWSAccessKeyId,
      secretAccessKey: Meteor.settings.private.AWSSecretAccessKey//,
    });

    var params = {
      Bucket: Meteor.settings.private.AWSBucket, // 'mybucket'
      Key: image.key // 'images/myimage.jpg'
    };
    
    s3.deleteObject(params, Meteor.bindEnvironment(function (error, data){
      if (!error) {
        Images.remove({_id: image_id});
      }
    }));
  },
  ///////////////////////////////
  // Edit pattern properties
  update_text_property: function(collection, object_id, property, value)
  {
    // used by the editable_field template
    // this function updates specified text properties of specified collections. It deliberately checks for known collections and properties to avoid unexpected database changes.
    check(object_id, NonEmptyString);
    check(collection, NonEmptyString);
    check(property, NonEmptyString);
    check(value, String);

    if (value.length > 6000)
      throw new Meteor.Error("not-authorized", "Value is too long");

    if (collection == "patterns")
    {
      var pattern = Patterns.findOne({_id: object_id}, { fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only update patterns you created");

      switch (property)
      {
        case "name":
        case "description":
        case "weaving_notes":
        case "threading_notes":
          if ((property == "name") && (value == ""))
            return; // pattern must have a name

          var update = {};
          update[property] = value; // this construction is necessary to handle a variable property name
          Patterns.update({_id: object_id}, {$set: update});
          
          // Record the edit time
          Meteor.call("save_text_edit_time", object_id);
          return;

          default:
            throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }

    if (collection == "images")
    {
      var image = Images.findOne({_id: object_id});
      var pattern = Patterns.findOne({_id: image.used_by})

      if (pattern.created_by != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only update patterns you created");
      // *** TODO check user can edit pattern
      switch (property)
      {
        case "caption":
          var update = {};
          update[property] = value; // this construction is necessary to handle a variable property name
          Images.update({_id: object_id}, {$set: update});
          return;

        default:
          throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }

    if (collection == "users")
    {
      // only the user can update their own profile
      if (object_id != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only change your own user details");

      switch (property)
      {
        case "description":
          // correct for me having messed up profiles by setting them as a text string not knowing it already existed
          // profile is an object to which editable properties may be added
          var profile = Meteor.users.findOne({ _id: object_id}).profile;
          if (typeof profile === "undefined")
            profile = {};
          
          profile[property] = value;

          Meteor.users.update({_id: object_id}, {$set: {profile: profile}});
          return;

        case "email_address":
          if (value == "")
            return;

          var old_emails = Meteor.users.findOne({ _id: object_id}).emails;
          if (old_emails) // user may have no emails
            var start_number = old_emails.length;
          else
            var start_number = 0;

          Accounts.addEmail(object_id, value); // I believe this runs synchronously because it is being called on the server

          // If addEmail doesn't throw an error, we can assume that either the new email was added, or it replaced one that was identical apart from case - in the latter case, verification status is unchanged. So the user should have an email address.
          var new_emails = Meteor.users.findOne({ _id: object_id}).emails;
          if (new_emails)
            var end_number = new_emails.length;
          else
            var end_number = 0;

          if (end_number > start_number) // email was successfully added
          {
            // remove any other email addresses - user should only have one.
            for (var i=0; i<new_emails.length; i++)
            {
              if (new_emails[i].address != value)
                Accounts.removeEmail(object_id, new_emails[i].address);
            }
            //Accounts.sendVerificationEmail(object_id);
            Meteor.call('sendVerificationEmail', object_id);
          }

          return;

        default:
          throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }
  },
  save_text_edit_time: function(pattern_id)
  {
    check(pattern_id, String);
    Patterns.update({_id: pattern_id}, {$set: {text_edited_at: moment().valueOf()}});
  },

  ///////////////////////////////
  // user account management
  sendVerificationEmail(userId, email)
  {
    check(userId, NonEmptyString);
    check(email, Match.Optional(String));

    if (userId != Meteor.userId())
      // Only the owner can request a verification email
      throw new Meteor.Error("not-authorized", "You can only request verification emails for your own email addresses");

    // check for the user having requested too many emails in too short a time
    var document_id = Meteor.call('get_actions_log');

    var db_document = ActionsLog.findOne({_id: document_id}, {fields: { verification_email_sent: 1, locked: 1 }} );

    var event_log = db_document.verification_email_sent;

    if (db_document.locked)
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    
    var number_of_entries = event_log.length;
    var time_since_last_action = moment().valueOf() - event_log[0];
    
    // try to detect automated email send
    // If the last 5 actions in a space of 1 second
    var last_5_actions_in = event_log[0] - event_log[4];
    if (last_5_actions_in < 2000)
    {
      // Don't allow another attempt for 5 minutes
      if (time_since_last_action < (60 * 1000 * 5))
        throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");

      // it's been at least 5 mins so consider allowing another email
      else
      {
        var last_10_actions_in = event_log[0] - event_log[9];
        if (last_10_actions_in < (60 * 1000 * 5))
        {
          // if the last 10 actions in 5 minutes 4 seconds, wait 30 minutes
          // this looks like an automatic process that has tried continually
          if (time_since_last_action < (60 * 1000 * 30 + 4000))
            throw new Meteor.Error("too-many-requests", "Please wait 30 mins before retrying");
        }
      }
    }

    // try to prevent sending too many emails if the user hits the button repeatedly
    // If the last 3 actions in a space of 1 minute, wait 5 minutes
    var last_3_actions_in = event_log[0] - event_log[2];
    if (last_3_actions_in < 60000)
    {
      // Don't allow another attempt for 5 minutes
      if (time_since_last_action < (60 * 1000 * 5))
        throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");
    }

    // Lock the user's account if 20 emails requested in 30 minutes
    var last_20_actions_in = event_log[0] - event_log[29];
    if (last_20_actions_in < 60 * 1000 * 30)
    {
      ActionsLog.update( {_id: document_id}, { locked: true } );
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    }

    // send the email
    // record the action in the log
    ActionsLog.update( {_id: document_id}, { $push: { verification_email_sent: {
      $each: [moment().valueOf()],
      $position: 0 
    }}} );

    // remove the oldest log entry if too many stored
    if (number_of_entries > Meteor.settings.private.verification_emails_num_to_log)
        ActionsLog.update( {_id: document_id}, { $pop: { verification_email_sent: 1 }} );

    if (typeof email !== "string")
      Accounts.sendVerificationEmail(Meteor.userId(), email);

    else
      Accounts.sendVerificationEmail(Meteor.userId());
  },
  // make sure the user has the correct role depending on whether their email address is verified
  update_user_roles(id)
  {
    check(id, String);

    if (Meteor.users.find({_id: id}).count() == 0)
      throw new Meteor.Error("not-found", "User width id " + id + "not found");
    var user = Meteor.users.findOne({_id: id});

    try {
      if (user.emails[0].verified)
      {
        Roles.addUsersToRoles(id, ['verified'], 'users');
      }
      else
      {
        Roles.removeUsersFromRoles(id, ['verified'], 'users');
      }
    }
    catch(err) {

    }
  },
  // return the action log for the current user
  // add a blank if none exists
  get_actions_log()
  {
    if (ActionsLog.find( {user_id: Meteor.userId()} ).count() == 0)
      return ActionsLog.insert({
        user_id: Meteor.userId(),
        username: Meteor.user().username,
        verification_email_sent: [],
        image_uploaded: [],
        image_removed: []
      });
    
    else
      return ActionsLog.findOne( {user_id: Meteor.userId()} )._id;
  },
  
  ///////////////////////////////
  // IMPORTANT!! Only works if "debug"
  // Meteor.call("debug_validate_email", Meteor.userId(), true)
  debug_validate_email(user_id, validated)
  {
    if (!Meteor.settings.private.debug)
      return;

    var emails = Meteor.users.findOne({ _id: user_id}).emails;
    emails[0]["verified"] = validated;
    var update = {};
    update["emails"] = emails;
    Meteor.users.update({_id: user_id}, {$set: update});
  }
});
