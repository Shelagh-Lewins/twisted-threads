Meteor.my_functions = {
  accept_click: function()
  {
    var accept_click = false;

    if (Session.equals('click_latch', false))
    {
      Session.set('click_latch', true);
      accept_click = true;

      setTimeout(function(){
        Session.set('click_latch', false);
      }, 300);
    }
    return accept_click;
  },
  ///////////////////////
  // creating patterns
  export_pattern_to_json: function(pattern_id) {

    // retrieve the pattern data from the database
    var pattern = Patterns.findOne({_id: pattern_id});
    if (typeof pattern === "undefined")
        return;

    var pattern_obj = {}; // JSON object to hold pattern

    // version number
    /*
      1.1 first ever
      1.11 added tags
      1.12 added weaving notes, threading notes
      1.13 added special styles
    */
    pattern_obj.version = "1.13";

    var number_of_rows = pattern.number_of_rows;
    var number_of_tablets = pattern.number_of_tablets;

    // Basic pattern properties
    pattern_obj.name = pattern.name;
    pattern_obj.description = pattern.description;
    if (typeof pattern.weaving_notes !== "undefined")
      pattern_obj.weaving_notes = pattern.weaving_notes;

    if (typeof pattern.threading_notes !== "undefined")
      pattern_obj.threading_notes = pattern.threading_notes;

    if (typeof pattern.tags !== "undefined")
      pattern_obj.tags = pattern.tags;

    else
      pattern_obj.tags = [];

    // Styles
    pattern_obj.styles = [];

    for (var i=0; i<current_styles.length; i++)
    {
      pattern_obj.styles[i] = current_styles[i];
    }

    // Special styles
    pattern_obj.special_styles = [];

    for (var i=0; i<current_special_styles.length; i++)
    {
      pattern_obj.special_styles[i] = current_special_styles[i];
    }

    // Orientation of tablets
    pattern_obj.orientation = new Array(number_of_tablets);

    for (var i=0; i<number_of_tablets; i++)
    {
      pattern_obj.orientation[i] = current_orientation[i].orientation;
    }

    // Threading of tablet holes
    pattern_obj.threading = new Array(4);

    for (var i=0; i<4; i++)
    {
      pattern_obj.threading[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        pattern_obj.threading[i][j] = current_threading_cells[i][j].style;
      }
    }

    // Weaving chart
    pattern_obj.weaving = new Array(number_of_rows);

    for (var i=0; i<number_of_rows; i++)
    {
      pattern_obj.weaving[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        pattern_obj.weaving[i][j] = current_weaving_cells[i][j].style;
      }
    }

    return pattern_obj;

    ///////////////////////////
    // Example JSON data for pattern
    /*
    {
    name: "my patttern",
    description: "This is a pattern",
    orientation: ["S", "Z", "S", "Z"], // one entry per tablet starting with tablet #1. Orientation is thread direction: "S" = tablet /, "Z" = tablet \
    threading: [ // columns are tablets starting with tablet #1
      [style, style, style, style, style, style], // hole A
      [style, style, style, style, style, style], // hole B
      [style, style, style, style, style, style], // hole C
      [style, style, style, style, style, style], // hole D
    ],

    weaving: [
      [style, style, style, style, style, style], // row 1
      [style, style, style, style, style, style], // row 2
      [style, style, style, style, style, style], // row 3
      [style, style, style, style, style, style], // row 4
      [style, style, style, style, style, style] // row 5
      etc
    ],
    // columns are tablets starting with tablet #1

    styles: [
      {
        background_color: "#FFFFFF",
        line_color: "#000000",
        forward_stroke: true,
        backward_stroke: false
      }
      // more styles
    ]
    
    */
  },
  copy_pattern: function(pattern_id)
  {
    Session.set('loading', true);
    var name = Patterns.findOne({_id: pattern_id}).name;

    // get the JSON data
    var data = Meteor.my_functions.export_pattern_to_json(pattern_id)

    // use it to create a new pattern
    var options = {
      name: name + " (copy)",
      data: data
    };
    Meteor.call('new_pattern_from_json', options, function(error, result){
      // automatically view new pattern
      Session.set('loading', false);

      if (error)
      {
        throw new Meteor.Error("new-pattern-error", "error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        Router.go('pattern', { _id: result });
        Meteor.my_functions.refresh_view_pattern(result);
      }
    });
  },
  new_pattern: function(name, number_of_tablets, number_of_rows)
  {
    Session.set('loading', true);

    if ((name=="") || (typeof name === "undefined"))
      var name="New pattern";

    var options = {
      number_of_tablets: number_of_tablets, // optional
      number_of_rows: number_of_rows, // optional
      name: name,
      filename: 'default_turning_pattern.json'
    };

    Meteor.call('new_pattern_from_json', options, function(error, result){
      Session.set('loading', false);

      // automatically view new pattern
      if (error)
      {
        throw new Meteor.Error("new-pattern-error", "error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        Router.go('pattern', { _id: result });
      }
    });
  },
  is_file_loading_supported: function() {
    if (window.File && window.FileReader && window.FileList && window.Blob)
      return true;

    else
      return false;
  },
  trim_file_extension: function(filename) {
    // assume the file extension is any text after the last '.'
    // filename may contain '.' e.g. "my.silly.file.html"
    // this only acts on a filename, not a full path

    var substrings = filename.split('.'); // split the string at '.'
    if (substrings.length == 1)
    {
      return filename; // there was no file extension, file was something like 'myfile'
    }
    else
    {
      substrings.pop(); // remove the last element from substrings
      var name = substrings.join(""); // rejoin the remaining elements
      return name;
    }
  },
  convert_windows_color_to_hex_rgb: function(windows_color)
  {
    // Windows color picker returns decimal BGR values
    // first convert to a 6-digit hex string
    var windows_color = parseInt(windows_color); // make sure we have a number
    var hex_color = ("000000" + windows_color.toString(16)).slice(-6); // pad from the start up to 6 digits

    // swap blue and red components
    hex_color = hex_color.substring(4,6) + hex_color.substring(2,4) + hex_color.substring(0,2);

    return "#" + hex_color;

  },
  import_pattern_from_json: function(data) {
    Session.set('loading', true);

    var options = {
      name: data.name,
      data: data
    };

    Meteor.call('new_pattern_from_json', options, function(error, result){
      Session.set('loading', false);
      
      if (error)
      {
        throw new Meteor.Error("new-pattern-error", "error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        // automatically view new pattern
        Router.go('pattern', { _id: result });
        Meteor.my_functions.refresh_view_pattern(result);
      }
    });
  },
  import_pattern_from_gtt: function(data, filename) {
    Session.set('loading', true);

    Meteor.call('xml2js', data, function(error, result){
      Session.set('loading', false);
      var local_error; // don't overwrite any error from the server

      if (error)
      {
        local_error = "error running xml2js: " + error.reason;
      }
      else
      {
        // perform basic checks on the data
        if (typeof result !== "object")
        {
          local_error = "no data";
        }
        else
        {
          data = result.TWData; // root object
       
          if (typeof data !== "object")
           local_error = "missing TWData";

          else if (data.Source != "Guntram's Tabletweaving Thingy")
           local_error = "data.Source is not 'Guntram's Tabletweaving Thingy'";
        }

        if (!local_error)
        {
          // now start analysing the data
          var pattern_data = data.Pattern[0];
          var pattern_obj = {}; // JSON object to hold pattern

          pattern_obj.version = "1.11";

          // pattern name
          if ((typeof pattern_data.Name[0] === "string") && (pattern_data.Name[0] != "")) // if present in pattern
            pattern_obj.name = pattern_data.Name[0];

          else if ((typeof filename === "string") && (filename != "")) // else try filename
            pattern_obj.name = filename;

          else // falback name
            pattern_obj.name = "Imported GTT pattern";

          // Description
          if (typeof pattern_data.Notes !== "undefined") // v1.05 doesn't include notes
          {
            if ((typeof pattern_data.Notes[0] === "string") && (pattern_data.Notes[0] != "")) // if present in pattern
              pattern_obj.description = pattern_data.Notes[0];
          }

          pattern_obj.tags = ["gtt"];

          //////////////////////////
          // Pattern type
          switch(pattern_data["$"].Type) // special key to access attributes (see https://github.com/Leonidas-from-XIV/node-xml2js for documentation of xml2js)
          {
            case "Threaded-in": // GTT v1.17
            case "Threaded": // GTT v1.05
              if (typeof pattern_obj.description === "undefined")
                pattern_obj.description = "A threaded-in pattern imported from Guntram's Tabletweaving Thingy (GTT)";
                var result = Meteor.my_functions.convert_gtt_threaded_in_pattern_to_json(pattern_data, pattern_obj); // split analysis of different pattern types off for readability
                if (result.error)
                  local_error = "Error converting pattern " + result.error;

                else pattern_obj = result.result;
              break;

            default:
              local_error = "Unhandled GTT pattern type: " + pattern_data["$"].Type;
              break;
          }
        }
          
      }
      if (local_error)
        alert("Error running import_pattern_from_gtt: " + local_error);

      else
      {
        Meteor.my_functions.import_pattern_from_json(pattern_obj);
      }
        
    });
  },
  convert_gtt_threaded_in_pattern_to_json: function(pattern_data, pattern_obj)
  {
    // Pattern data has been read in from a .gtt file and the header information analysed
    // pattern_data is the file data converted to JSON
    // pattern_obj is the unfinished JSON pattern object which needs to be filled in with pattern details
    var error;
    pattern_obj.tags.push("threaded-in");

    // analyse tablet orientation and thread colour
    var tablets_data = pattern_data.Cards[0].Card;
    var number_of_tablets = tablets_data.length;
    pattern_obj.orientation = [];
    pattern_obj.threading = [
      [], // hole A
      [], // hole B
      [], // hole C
      [] // hole D
    ];
    // colours records the thread colour for the hole. This will need to be translated into styles showing direction and orientation.
    var tablet_colors = [
      [], // hole A
      [], // hole B
      [], // hole C
      [] // hole D
    ];
    var unique_colours_counter = {}; // for counting occurrences of colours
    var unique_colors_list = [];
    pattern_obj.weaving = []; // TODO fill in
    pattern_obj.styles = [];
    for (var i=0; i<32; i++)
    {
      pattern_obj.styles.push({
        background_color: "#FFFFFF",
        line_color: "#000000",
        forward_stroke: false,
        backward_stroke: false
      });
    }

    // list all thread colors used in tablets, and map each color to a tablet
    for (var i=0; i< number_of_tablets; i++)
    {
      pattern_obj.orientation.push(tablets_data[i].Threading[0]);

      var tablet_styles = tablets_data[i].Holes[0].Colour; // should be an array with 4 elements
      if (tablet_styles.length != 4)
      {
        return {error: "tablet with index " + (i) + " does not have four Colours"};
      }
      else
      {
        for (var j=0; j<4; j++)
        {
          // arrange the colours for each tablet
          var colour_index = tablet_styles[j];
          tablet_colors[j].push(colour_index);

          // count how many times each colour is used
          if (!unique_colours_counter[colour_index])
            unique_colours_counter[colour_index] = 1;

          else
            unique_colours_counter[colour_index] +=1;         
        }
      }
    }
    for (var property in unique_colours_counter) {
      if (unique_colours_counter.hasOwnProperty(property)) {
        unique_colors_list.push(parseInt(property));
      }
    }
    unique_colors_list.sort(function(a, b){return unique_colours_counter[b]-unique_colours_counter[a]}); // Sort colours by usage, most used first

    // turning patterns can only handle 8 colors because there are 4 variants of each for a total of 32 styles
    // so replace any colours past the first 8 with the 8th colour
    if (unique_colors_list.length > 8)
    {
      for (var i=0; i< number_of_tablets; i++)
      {
        for (var j=0; j<4; j++)
        {
          if (unique_colors_list.indexOf(tablet_colors[j][i]) > 7)
            tablet_colors[j][i] = unique_colors_list[7];
        }
      }
    }

    ////////////////////////////////
    // Build styles
    // find the colours in the palette
    var palette = pattern_data.Palette[0].Colour;
    var number_of_colours = Math.min(palette.length, unique_colors_list.length, 8);

    var style_lookup = {}; // find a style from thread Palette color index, orientation (S, Z) and turning direction (forwards, backwards)

    for (var i=0; i<number_of_colours; i++)
    {
      var windows_color = parseInt(palette[unique_colors_list[i]]["_"]);

      var line_color = Meteor.my_functions.convert_windows_color_to_hex_rgb(windows_color); // GTT uses Windows color picker

      // lookup style by palette index, orientation, forwards
      // e.g. style_lookup[0]["S"][true] will return the style that corresponds to Palette colour 0 (i.e. the first in the XML), S threaded, turn forwards
      var style_start = 2*i; // first style of set
      if (i >= 4) // styles are built in two pages
        style_start = 8 + (2*i);

      style_lookup[unique_colors_list[i]] = {
        S: {
          true: style_start + 1, // forwards
          false: style_start + 9 // backwards
        },
        Z: {
          true: style_start + 2, // forwards
          false: style_start + 10 // backwards
        }
      }

      // S, turn forwards = forward stroke, white bg
      pattern_obj.styles[style_start] = {
        background_color: "#FFFFFF",
        line_color: line_color,
        forward_stroke: true,
        backward_stroke: false
      };

      // Z, turn forwards = backward stroke, white bg
      pattern_obj.styles[style_start + 1] = {
        background_color: "#FFFFFF",
        line_color: line_color,
        forward_stroke: false,
        backward_stroke: true
      };

      // S, turn backwards = backward stroke, grey bg
      pattern_obj.styles[style_start + 8] = {
        background_color: "#666666",
        line_color: line_color,
        forward_stroke: false,
        backward_stroke: true
      };

      // Z, turn backwards = forward stroke, grey bg
      pattern_obj.styles[style_start + 9] = {
        background_color: "#666666",
        line_color: line_color,
        forward_stroke: true,
        backward_stroke: false
      };
    }

    /////////////////////////////////
    // assign styles to threading
    for (var i=0; i< number_of_tablets; i++)
    {
      var orientation = pattern_obj.orientation[i];

      for (var j=0; j<4; j++)
      {
        var thread_color = tablet_colors[3-j][i]; // read holes D -> A
        pattern_obj.threading[j].push(style_lookup[thread_color][orientation][true]);
      }
    }

    //////////////////////////////////
    // build weaving chart

    // note which thread is in the "A" position of each tablet at the start of weaving
    var position_A_threads = [];
    var current_turn_direction = [];
    for (var i=0; i<number_of_tablets; i++)
    {
      position_A_threads.push(0); // start all tablets with the "A" thread
      current_turn_direction.push("F");
    }

    var picks = pattern_data.Picks[0].Pick; // weaving data

    // check for multiple packs of cards
    var uses_packs = false;
    var packs = {};
    try
    {
      var packs_data = pattern_data.Packs[0].Pack; // the files generally contain a Packs object but it may not have any nodes
      if (packs_data.length > 0)
        uses_packs = true;

      for (var i=0; i<packs_data.length; i++) // build packs
      {
        var name = packs_data[i]["$"].Name;
        var cards = packs_data[i].Cards[0].split(",");
        var tablets = [];
        for (var j=0; j<cards.length; j++)
        {
          tablets.push(parseInt(cards[j])-1); // cards in data are numbered from 1, but arrays start at 0
        }
        
        packs[name] = tablets;
      }
    }
    catch(err)
    {

    }

    // method to handle turning a tablet forward or backward
    this.turn_tablet = function(tablet, direction, distance) {
      var position_A_thread = position_A_threads[tablet]; // visible thread for this tablet

      if (direction == current_turn_direction[tablet])
      {
        // TODO check for distance == 3, 2 or 1

        // update the visible thread
        if (direction == "F")
          position_A_thread -= distance;

        else
          position_A_thread += distance;

        if (position_A_thread < 0)
          position_A_thread += 4; // % operator is remainder not      modulus

        position_A_thread = position_A_thread % 4;
        position_A_threads[tablet] = position_A_thread;
        
      }
      else // reversing turning direction keeps the same thread
      {
        current_turn_direction[tablet] = direction;
      }

      var orientation = pattern_obj.orientation[tablet]; // orientation of tablet
      var thread_color = tablet_colors[position_A_thread][tablet];

      new_row[tablet] = style_lookup[thread_color][orientation][(action.Dir == "F")];

      return;
    };

    for (var i=0; i<picks.length; i++) // each weaving row
    {
      var new_row = []; // build a blank row for row styles
      for (var j=0; j<number_of_tablets; j++)
      {
        new_row.push(1); // placeholder, will be overwritten by pack data
      }
      var actions = picks[i].Actions[0].Action;

      for (var j=0; j<actions.length; j++)
      {
        var action = actions[j]["$"];

        if (action.Type == "Turn")
        {
          var distance = parseInt(action.Dist); // usually 1 (quarter turn)
          var direction = action.Dir; //  "F" or "B"

          if (action.Target == "Pack") // turn all tablets in a pack
          {
            
            var target_pack = packs[action.TargetID];
            if (typeof target_pack === "undefined")
                return {error: "no pack " + (action.TargetID) + " has been defined"};

            for (var k=0; k<target_pack.length; k++) // each tablet in pack
            {
              var tablet = target_pack[k];
              this.turn_tablet(tablet, direction, distance);
            }
          }
          else if (action.Target == "Card") // turn an individual tablet
          {
            var tablet = parseInt(action.TargetID) - 1;
            if (typeof position_A_threads[tablet] === "undefined")
                return {error: "no tablet " + tablet + " has been defined"};

            this.turn_tablet(tablet, direction, distance);
          }
        }
      }
      pattern_obj.weaving.push(new_row);
    }

    return {result: pattern_obj};
    // TODO back in loading file, find how to check file type make sure it's text not image

    // Questions for Guntram
    /*
      Are selvedges important?
      Other variations within threaded-in patterns over twist, packs?
      How do you weave from double faced and 3/1 broken twill?
    */
  },
  store_pattern: function(pattern_id)
  {
    var pattern = Patterns.findOne({_id: pattern_id});

    var data = {};
    data._id = pattern_id;
    data.number_of_tablets = current_weaving_cells[0].length;
    data.number_of_rows = current_weaving_cells.length;

    data.weaving = Meteor.my_functions.get_weaving_as_text(pattern_id);
    data.threading = Meteor.my_functions.get_threading_as_text(pattern_id);
    data.orientation = Meteor.my_functions.get_orientation_as_text(pattern_id);
    data.styles = Meteor.my_functions.get_styles_as_text(pattern_id);

    // remove any stored states after this point
    var splice_position = Session.get('undo_stack_position') + 1;
    var number_to_splice = stored_patterns.length - splice_position;
    stored_patterns.splice(splice_position, number_to_splice);

    stored_patterns.push(data); // add the new stored pattern to the stack

    if (stored_patterns.length > Meteor.my_params.undo_stack_length)
    {
      stored_patterns.splice(0, stored_patterns.length - Meteor.my_params.undo_stack_length); // 'forget' stored patterns if the stack is too long
      // the stack length has not changed, so don't update the position
    }
    else
    {
      // stack is longer so move position up by 1
      var position = parseInt(Session.get('undo_stack_position'));
      Session.set('undo_stack_position', position + 1);
    }
  },
  restore_pattern: function(index, pattern_id)
  {
    // restore the current pattern from the index position in the stored_patterns stack
    if (index < 0)
      return;

    if (index >= (Meteor.my_params.undo_stack_length))
      return;

    if (index >= stored_patterns.length)
      return;

    var data = stored_patterns[index];

    if (data._id != pattern_id)
      return;

    Meteor.call('restore_pattern', data, function(){
      Meteor.my_functions.build_pattern_display_data(pattern_id);
      Meteor.my_functions.initialize_background_color_picker();
      Meteor.my_functions.initialize_line_color_picker()
    });
  },
  undo: function(pattern_id)
  {
    
    var position = parseInt(Session.get('undo_stack_position')) - 1;
    
    // nothing to undo
    if (position < 0)
      return;

    Meteor.my_functions.restore_pattern(position, pattern_id);

    // update stack position
    Session.set('undo_stack_position', position);
  },
  redo: function(pattern_id)
  {
    var position = parseInt(Session.get('undo_stack_position'))+1;

    if (position >= stored_patterns.length)
      return;

    Meteor.my_functions.restore_pattern(position, pattern_id);
    // update stack position
    Session.set('undo_stack_position', (position));
  },
  //////////////////////////////////
  // Pattern thumbnails - how many will fit in a single row across the home screen
  patterns_in_row: function()
  {
    var available_width = $('#main_column').width();

    var thumbnail_width = Meteor.my_params.pattern_thumbnail_width + Meteor.my_params.pattern_thumbnail_rmargin;

    var number_to_show = Math.floor(available_width / thumbnail_width);
    return number_to_show;
  },
  //////////////////////////////////
  // Recent Patterns
  add_to_recent_patterns: function(pattern_id)
  {
    
    if (pattern_id == null)
        return;

    if (Meteor.userId()) // the user is signed in
    {
      
      Meteor.call('add_to_recent_patterns', pattern_id);
    }
    else
    {
      // store recent patterns locally as an array of _id values
      // the pattern properties are stored separately e.g 'accessed_at'. This is just a list of pattern ids.
      var recent_patterns = window.localStorage.getItem('recent_patterns');

      if (recent_patterns == null)
        recent_patterns = [];

      else
        recent_patterns = JSON.parse(recent_patterns);

      // remove any existing occurences of the pattern
      for(var i = recent_patterns.length-1; i>=0; i--)
      {
        if (recent_patterns[i] == pattern_id) recent_patterns.splice(i, 1);
      }
      
      // and add the pattern as the most recent i.e. first element
      recent_patterns.unshift(pattern_id);
      console.log("add to recents");
      window.localStorage.setItem('recent_patterns', JSON.stringify(recent_patterns));

      if (recent_patterns.length > 50) // don't store too many patterns
        recent_patterns.pop();
    }
  },
  maintain_recent_patterns: function() {
    // remove any patterns that no longer exist or are now hidden from the user
    // mostly important in browser because when the database is reset, the localStorage ids become invalid

    if (Meteor.userId()) // the user is signed in
    {
      Meteor.call('maintain_recent_patterns');
    }
    else
    {
      var recent_patterns = JSON.parse(window.localStorage.getItem('recent_patterns'));

      for(var i = recent_patterns.length-1; i>=0; i--)
      {
        var pattern_id = recent_patterns[i];
        if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
        {
          recent_patterns.splice(i, 1);
        }
      }
      window.localStorage.setItem('recent_patterns', JSON.stringify(recent_patterns));
    }
  },
  get_local_recent_pattern_ids: function(){
    var pattern_ids = JSON.parse(window.localStorage.getItem('recent_patterns'));

    if (pattern_ids == null)
        return [];

    // check the patterns exist / can be viewed
    var checked_pattern_ids = [];
    for (var i=0; i<pattern_ids.length; i++)
    {
      var id = pattern_ids[i];

      if (id == null) continue;
      if (typeof id === "undefined") continue;
      if (Patterns.find({_id: id}).count() == 0) continue;

      checked_pattern_ids.push(id);
    }
    return checked_pattern_ids;
  },
  ///////////////////////////////
  // Edit pattern
  can_edit_pattern: function(pattern_id) {
    // user is not logged in
    if (!Meteor.userId())
        return false;

    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
        return false;

    if (Meteor.userId() == pattern.created_by)
       return true;

    else
       return false;
  },
  can_edit_style: function(style) {
    var editable = true;

    if (typeof style === "string") // special styles are not editable
      if (style.charAt(0) == "S")
        editable = false;

    return editable;
  },
  get_selected_style: function() {
    // which style to use depends on the selected page in the styles palette
    if (Session.equals('styles_palette', "special"))
      return Session.get("selected_special_style");

    else
      return Session.get("selected_style");
  },
  build_pattern_display_data:  function(pattern_id)
  {
    // maintain a local array of arrays with the data for the current pattern in optimum form. Getting each row out of the database when drawing it is very slow.

    // elements in reactive arrays need to be updated with arr.splice(pos, 1 new_value) to be reactive

    var pattern = Patterns.findOne({_id: pattern_id});

    number_of_tablets = pattern.number_of_tablets;
    number_of_rows = pattern.number_of_rows;

    //////////////////////////////
    // tablet numbers (tablet_indexes)
    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_tablet_indexes !== "undefined")
      current_tablet_indexes.clear();

    var indexes = new Array(number_of_tablets);
    for (var i=0; i<number_of_tablets; i++)
    {
      indexes[i] = i+1; // row 1 at bottom
    }
    current_tablet_indexes = new ReactiveArray(indexes);

    //////////////////////////////
    // row numbers (row_indexes)
    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_row_indexes !== "undefined")
      current_row_indexes.clear();

    var indexes = new Array(number_of_rows);
    for (var i=0; i<number_of_rows; i++)
    {
      indexes[i] = number_of_rows-i; // row 1 at bottom
    }
    current_row_indexes = new ReactiveArray(indexes);

    //////////////////////////////
    // build the weaving chart data

    // assign array of arrays to hold data
    var rows = new Array(number_of_rows);

    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_weaving_cells !== "undefined")
      current_weaving_cells.clear();

    current_weaving_cells = new ReactiveArray(rows);

    for (var i=0; i<number_of_rows; i++)
    {
      var row = new Array(number_of_tablets);
      current_weaving_cells[i] = new ReactiveArray(row);
    }

    // put the weaving data into the array of arrays
    var weaving_data = JSON.parse(pattern.weaving);
    test = weaving_data;

    for (var i=0; i<number_of_rows; i++)
    {
      for (var j=0; j<number_of_tablets; j++)
      {
        var obj = {
          row: i+1,
          tablet: j+1,
          style: weaving_data[i][j]
        }
        current_weaving_cells[i][j] = obj;
      }
    }

    //////////////////////////////
    // build the threading chart data
    var rows = new Array(4);

    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_threading_cells !== "undefined")
      current_threading_cells.clear();

    current_threading_cells = new ReactiveArray(rows);

    var threading_data = JSON.parse(pattern.threading);

    for (var i=0; i<4; i++)
    {
      var row = new Array(number_of_tablets);
      current_threading_cells[i] = new ReactiveArray(row);

      for (var j=0; j<number_of_tablets; j++)
      {
        var obj = {
          hole: i+1,
          tablet: j+1,
          style: threading_data[i][j]
        }

        current_threading_cells[i][j] = obj;
      }
    }

    //////////////////////////////
    // build the orientation data
    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_orientation !== "undefined")
      current_orientation.clear();

    var blank_arr = new Array(number_of_tablets)
    current_orientation = new ReactiveArray(blank_arr);

    var orientation_data = JSON.parse(pattern.orientation);

    for (var i=0; i<number_of_tablets; i++)
    {
      var obj = {
        tablet: i+1,
        orientation: orientation_data[i]
      }

      current_orientation[i] = obj;
    }

    //////////////////////////////
    // build the styles data
    // Regular styles - editable by user
    var styles_data = JSON.parse(pattern.styles);
    var number_of_styles = styles_data.length;

    var styles_array = new Array(number_of_styles);
    for (var i=0; i<number_of_styles; i++)
    {
      styles_array[i] = styles_data[i];

      styles_array[i].style = i+1;

      if (typeof styles_array[i].background_color === "undefined")
        styles_array[i].background_color = "#FFFFFF";

      if (typeof styles_array[i].line_color === "undefined")
        styles_array[i].line_color = "#000000";

      if (styles_array[i].forward_stroke)
        styles_array[i].forward_stroke = "forward_stroke";

      else
        styles_array[i].forward_stroke = null;

      if (styles_array[i].backward_stroke)
        styles_array[i].backward_stroke = "backward_stroke";

      else
        styles_array[i].backward_stroke = null;
    }

    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_styles !== "undefined")
      current_styles.clear();

    current_styles = new ReactiveArray(styles_array);

    ////////////////////////////////
    // Special styles - not editable
    if (typeof pattern.special_styles !== "undefined") // older patterns don't have special styles
      special_styles_data = JSON.parse(pattern.special_styles);

    else
      special_styles_data = [];

    var special_styles_array = new Array(Meteor.my_params.special_styles_number);
    for (var i=0; i<Meteor.my_params.special_styles_number; i++)
    {
      if ((typeof special_styles_data[i] === "undefined") || (special_styles_data[i] == null))
        special_styles_array[i] = default_special_styles[i];

      else 
        special_styles_array[i] = special_styles_data[i];

      special_styles_array[i].style = "S" + (i+1);
    }

    // if rebuilding, clearing the array forces helpers to rerun
    if (typeof current_special_styles !== "undefined")
      current_special_styles.clear();

    current_special_styles = new ReactiveArray(special_styles_array);
  },
  add_weaving_row: function(pattern_id, position, style)
  {
    var number_of_tablets = current_weaving_cells[0].length;
    var number_of_rows = current_weaving_cells.length;

    if (number_of_rows == 0)
      var position = 1;

    if (position == -1) // -1 is a shorthand meaning add row at end
      var position = number_of_rows+1;

    if (position < 0) // -1 is a shorthand meaning add row at end
      var position = 1;

    // increment row number of cells in subsequent rows
    for (var i=number_of_rows-1; i>= position-1; i--)
    {
      for (var j=0; j<number_of_tablets; j++)
      {
        current_weaving_cells[i][j].row += 1;
      }
    }

    var new_row = new Array(number_of_tablets);
    for (var i=0; i<number_of_tablets; i++)
    {
      var obj = {
        row: position,
        tablet: i+1,
        style: style
      }
      new_row[i] = obj;
    }

    var reactive_row = new ReactiveArray(new_row);
    current_weaving_cells.splice(position-1, 0, reactive_row);
    current_row_indexes.unshift(number_of_rows+1); //  rows are reversed

    Meteor.my_functions.save_weaving_as_text(pattern_id);
  },
  remove_weaving_row: function(pattern_id, position){
    var number_of_tablets = current_weaving_cells[0].length;
    var number_of_rows = current_weaving_cells.length;

    if ((number_of_rows <= 1) || (position < 1) || (position > (number_of_rows)))
      return;

    // decrement row number of cells in subsequent rows
    for (var i=number_of_rows-1; i>= position; i--)
    {
      for (var j=0; j<number_of_tablets; j++)
      {
        current_weaving_cells[i][j].row -= 1;
      }
    }

    current_weaving_cells.splice(position-1, 1);
    current_row_indexes.shift(); // rows are reversed
    Meteor.my_functions.save_weaving_as_text(pattern_id);
  },
  add_tablet: function(pattern_id, position, style)
  {
    var number_of_tablets = current_weaving_cells[0].length;
    var number_of_rows = current_weaving_cells.length;

    if (position == -1) // -1 is a shorthand meaning add tablet at end
      var position = number_of_tablets+1;

    // weaving
    for (var i=0; i<number_of_rows; i++)
    {
      for (var j=number_of_tablets-1; j>= position-1; j--)
      {
        current_weaving_cells[i][j].tablet += 1;
      }

      var obj = {
        row: i+1,
        tablet: position,
        style: style
      }
      current_weaving_cells[i].splice(position-1, 0, obj);
    }

    // threading
    for (var i=0; i<4; i++)
    {
      for (var j=number_of_tablets-1; j>= position-1; j--)
      {
        current_threading_cells[i][j].tablet += 1;
      }
      var obj = {
        hole: i+1,
        tablet: position,
        style: style
      }
      current_threading_cells[i].splice(position-1, 0, obj);
    }

    // orientation
    for (var i=number_of_tablets-1; i>= position-1; i--)
    {
      current_orientation[i].tablet += 1;
    }

    var obj = {
      tablet: position,
      orientation: "S"
    }

    current_orientation.splice(position-1, 0, obj);

    // add new tablet to indexes
    current_tablet_indexes.push(number_of_tablets+1);

    // save to database
    Meteor.my_functions.save_weaving_as_text(pattern_id);
    Meteor.my_functions.save_threading_as_text(pattern_id);
    Meteor.my_functions.save_orientation_as_text(pattern_id);
  },
  remove_tablet: function(pattern_id, position)
  {
    var number_of_tablets = current_weaving_cells[0].length;
    var number_of_rows = current_weaving_cells.length;

    if ((number_of_tablets <= 1) || (position < 1) || (position > (number_of_tablets)))
      return;

    // weaving
    for (var i=0; i<number_of_rows; i++)
    {
      for (var j=number_of_tablets-1; j>= position-1; j--)
      {
        current_weaving_cells[i][j].tablet -= 1;
      }
      current_weaving_cells[i].splice(position-1, 1);
    }

    // threading
    for (var i=0; i<4; i++)
    {
      for (var j=number_of_tablets-1; j>= position-1; j--)
      {
        current_threading_cells[i][j].tablet -= 1;
      }
      current_threading_cells[i].splice(position-1, 1);
    }

    // orientation
    for (var j=number_of_tablets-1; j>= position-1; j--)
    {
      current_orientation[i].tablet -= 1;
    }
    current_orientation.splice(position-1, 1);

    // remove tablet from indexes
    current_tablet_indexes.pop();

    // save to database
    Meteor.my_functions.save_weaving_as_text(pattern_id);
    Meteor.my_functions.save_threading_as_text(pattern_id);
    Meteor.my_functions.save_orientation_as_text(pattern_id);
  },
  get_weaving_as_text: function(pattern_id)
  {
    var number_of_rows = current_weaving_cells.length;
    var number_of_tablets = current_weaving_cells[0].length;

    // turn the reactive array of objects into simple nested arrays of style values
    var weaving_array = new Array(number_of_rows);

    for (var i=0; i<number_of_rows; i++)
    {;
      weaving_array[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        weaving_array[i][j] = current_weaving_cells[i][j].style;
      }
    }

    return weaving_array;
  },
  //save_weaving_as_text: function(pattern_id)
  save_weaving_as_text: function(pattern_id)
  {
    var number_of_rows = current_weaving_cells.length;
    var number_of_tablets = current_weaving_cells[0].length;

    var weaving_array = Meteor.my_functions.get_weaving_as_text(pattern_id);

    Meteor.call('save_weaving_as_text', pattern_id, JSON.stringify(weaving_array), number_of_rows, number_of_tablets);
  },
  get_threading_as_text: function(pattern_id)
  {
    var number_of_tablets = current_threading_cells[0].length;

    // turn the reactive array of objects into simple nested arrays of style values
    var threading_array = new Array(4);

    for (var i=0; i<4; i++)
    {
      threading_array[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        threading_array[i][j] = current_threading_cells[i][j].style;
      }
    }

    return threading_array;
  },
  save_threading_as_text: function(pattern_id)
  {
    var threading_array = Meteor.my_functions.get_threading_as_text(pattern_id);
    Meteor.call('save_threading_as_text', pattern_id, JSON.stringify(threading_array));
  },
  get_orientation_as_text: function(pattern_id)
  {
    var number_of_tablets = current_orientation.length;

    var orientation_array = new Array(number_of_tablets);

    for (var i=0; i<number_of_tablets; i++)
    {
      orientation_array[i] = current_orientation[i].orientation;
    }

    return orientation_array;
  },
  save_orientation_as_text: function(pattern_id)
  {
    var orientation_array = Meteor.my_functions.get_orientation_as_text(pattern_id);

    Meteor.call('save_orientation_as_text', pattern_id, JSON.stringify(orientation_array));   
  },
  get_styles_as_text: function(pattern_id)
  {
    var styles_array = [];
    for (var i=0; i<current_styles.length; i++)
    {
      styles_array[i] = jQuery.extend({}, current_styles[i]);
    }

    return styles_array;
  },
  save_styles_as_text: function(pattern_id)
  {
    var styles_array = Meteor.my_functions.get_styles_as_text(pattern_id);

    Meteor.call('save_styles_as_text', pattern_id, JSON.stringify(styles_array)); 
  },
  ///////////////////////////////
  // Color pickers 
  initialize_background_color_picker: function()
  {
    // Set the #background_colorpicker to the selected style's background colour
    var selected_style = Session.get("selected_style");

    if (!Meteor.my_functions.can_edit_style(selected_style))
        return;
      
    var pattern_id = Router.current().params._id;

    //if (Patterns.findOne({_id: pattern_id}) == null)
    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
    {
      setTimeout(function(){Meteor.my_functions.initialize_background_color_picker(); }, 10);
    }
    else
    {
      var selected_background_color = current_styles[selected_style-1].background_color;
      // Spectrum color picker
      // https://atmospherejs.com/ryanswapp/spectrum-colorpicker
      // https://bgrins.github.io/spectrum/
      $("#background_colorpicker").spectrum({
        color: selected_background_color,
        showInput: true,
        className: "full-spectrum",
        showInitial: true,
        showPalette: true,
        hideAfterPaletteSelect:true, // BUG The "change" event is firing incorrectly whenever you select a colour. Closing the palette after selecting a colour is a cheap workaround.
        showSelectionPalette: true,
        maxSelectionSize: 10,
        preferredFormat: "hex",
        move: function (color) {

        },
        show: function () {

        },
        beforeShow: function () {

        },
        hide: function () {

        },
        change: function(color) {
          var selected_style = Session.get("selected_style");
          var options = {
            background_color: color.toHexString(),
            is_dark: (color.toHsl().l < 0.4) ? true:false
          };

          var pattern_id = Router.current().params._id;

          // update local reactiveArray
          var obj = current_styles[selected_style-1];
          obj.background_color = options.background_color;
          current_styles.splice(selected_style-1, 1, obj);

          // update database
          Meteor.my_functions.save_styles_as_text(pattern_id);

          // store style for undo stack
          Meteor.my_functions.store_pattern(pattern_id);
        },
        palette: [
            ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
            "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
            ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
            "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
            ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
            "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)",
            "rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
            "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)",
            "rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
            "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)",
            "rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
            "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)",
            "rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
            "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
        ]
      });
    }
  },
  initialize_line_color_picker: function()
  {
    // Set the #line_colorpicker to the selected style's background colour
    var selected_style = Session.get("selected_style");

    if (!Meteor.my_functions.can_edit_style(selected_style))
        return;

    var pattern_id = Router.current().params._id;

    var selected_line_color = current_styles[selected_style-1].line_color;
    // Spectrum color picker
    // https://atmospherejs.com/ryanswapp/spectrum-colorpicker
    // https://bgrins.github.io/spectrum/
    $("#line_colorpicker").spectrum({
      color: selected_line_color,
      showInput: true,
      className: "full-spectrum",
      showInitial: true,
      showPalette: true,
      hideAfterPaletteSelect:true, // BUG The "change" event is firing incorrectly whenever you select a colour. Closing the palette after selecting a colour is a cheap workaround.
      showSelectionPalette: true,
      maxSelectionSize: 10,
      preferredFormat: "hex",
      move: function (color) {

      },
      show: function () {

      },
      beforeShow: function () {

      },
      hide: function () {

      },
      change: function(color) {
        var selected_style = Session.get("selected_style");
        var options = {
          line_color: color.toHexString(),
        };

        var pattern_id = Router.current().params._id;

        // update local reactiveArray
        var obj = current_styles[selected_style-1];
        obj.line_color = options.line_color;
        current_styles.splice(selected_style-1, 1, obj);

        // update database
        Meteor.my_functions.save_styles_as_text(pattern_id);

        // store style for undo stack
        Meteor.my_functions.store_pattern(pattern_id);      
      },
      palette: [
          ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
          "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
          ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
          "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
          ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
          "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)",
          "rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
          "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)",
          "rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
          "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)",
          "rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
          "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)",
          "rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
          "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
      ]
    });
  },
  update_color_pickers: function()
  {
    // Set the #background_colorpicker to the selected style's background colour
    var selected_style = Session.get("selected_style");
    
    if (!Meteor.my_functions.can_edit_style(selected_style))
      return;

    // Background color picker
    var selected_background_color = current_styles[selected_style-1].background_color;

    $("#background_colorpicker").spectrum("set", selected_background_color);

    // Line color picker
    var selected_line_color = current_styles[selected_style-1].line_color;

    $("#line_colorpicker").spectrum("set", selected_line_color);
    $("#line_colorpicker").spectrum("set", selected_line_color);
  },
  //////////////////////////////////
  // sizing and scrolling, to keep header and styles_palette in correct positions
  initialize_route: function() {
    // tidying up to be done whenever the router renders a new template.
    // this is called from each template's 'rendered' function
    // I haven't found a way to do this from the router
    Session.set('menu_open', false);
    Meteor.my_functions.resize_page();
    Session.set("loading", false);
    Session.set('show_pattern_as_text', false);
    Session.set('show_import_pattern', false);

    // make sure scroll is top left
    $('#width').scrollLeft(0);
    $('#width').scrollTop(0);
  },
  //////////////////////////////////
  // set up and draw the view pattern. This must be refreshed if the user switches pattern without switching view: e.g. using copy, import
  view_pattern_created: function(pattern_id) {
    Meteor.my_functions.build_pattern_display_data(pattern_id);
  
    // intialise the 'undo' stack
    // ideally the undo stack would be maintained over server refreshes but I'm not sure a session var could hold multiple patterns, and nothing else except the database is persistent. Also it doesn't need to be reactive so a session var might be a performance hit.
    stored_patterns = [];
    Session.set('undo_stack_position', -1);
    Meteor.my_functions.store_pattern(pattern_id);
  },
  view_pattern_render: function(pattern_id) {
    if (Meteor.my_functions.can_edit_pattern(pattern_id))
    $('body').addClass('editable');

    Session.set('edit_style', false);

    if (typeof Session.get('styles_palette') === "undefined")
      Session.set('styles_palette', "styles_1");

    if (Session.equals('styles_palette', "special"))
      Session.set('show_special_styles', true);

    else
      Session.set('show_special_styles', false);

    Session.set("selected_style", 1);
    Session.set("selected_special_style", "S1");
  },
  refresh_view_pattern: function(pattern_id) {
    Meteor.my_functions.view_pattern_created(pattern_id);
    Meteor.my_functions.view_pattern_render(pattern_id);
  },
  resize_page: function() {
    // set height of '#width' to fill viewport
    var new_height = $("body").innerHeight();

    if (($("#styles_palette").outerHeight(true) != null) && $("#styles_palette").is(":visible"))
      new_height -= $("#styles_palette").outerHeight(true);
    
    $("#width").css({
        'height': new_height
    });

    // keep the header in the viewport
    $('#header').css({
        'left': $("#width").scrollLeft() // Always at left edge of window
    });

    // keep the toolbar in the viewport
    if ($("#toolbar").length > 0)
    {
      var toolbar_offset = $("#toolbar").position().top;
      $("#toolbar .inner_tube").css("top", Math.max(-1 * toolbar_offset, 0));

      var left = $("#width").scrollLeft();
      $("#toolbar .inner_tube").css("left", left);
    }    
  },
  //////////////////////////////////////////////
  // Weave View
  initialize_weave: function() {
    var pattern_id = Router.current().params._id;
    var current_weave_row = 1;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
      return; // the pattern doesn't exist

    if (Meteor.userId()) // the user is signed in
    {
      if (Recent_Patterns.find({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]}, {fields: {_id: 1}}, {limit: 1}).count() != 0) // the pattern is in Recent_Patterns
      {
        var recent_pattern = Recent_Patterns.findOne({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]});
        
        if (typeof recent_pattern.current_weave_row !== "undefined")
          current_weave_row = recent_pattern.current_weave_row;
      }
    }
    else
    {
      // look in localStorage
      var data = Meteor.my_functions.get_pattern_data_from_local_storage(pattern_id);

      if (typeof data.current_weave_row !== "undefined")
        current_weave_row = data.current_weave_row;
    }
    
    current_weave_row = Meteor.my_functions.validate_row_number_read(current_weave_row);

    Meteor.my_functions.set_current_weave_row(current_weave_row);

    // wait to allow the pattern to be rendered in the DOM, then scroll the selected row into view
    setTimeout(function(){
      Meteor.my_functions.scroll_selected_row_into_view();
    }, 50);
  },
  scroll_selected_row_into_view: function() {

    // Note that jQuery scrollIntoView messes things up
    setTimeout(function(){
      var container = $('#width');
      var scrollTo = $('.pattern.weave .row.selected .inner_tube');
      var scroll_amount = (scrollTo.offset().top + scrollTo.outerHeight(true)) - container.outerHeight(true);

      if (scroll_amount > 0)
        container.scrollTop(scroll_amount);
    }, 50);
  },
  set_current_weave_row: function(row_number) {
    if (typeof row_number === "undefined")
      var row_number = 1; // default value

    var pattern_id = Router.current().params._id;

    var pattern = Patterns.findOne({_id: pattern_id});
    var number_of_rows = pattern.number_of_rows;

    if (row_number == number_of_rows + 1)
    {
      var row_number = 1; // if at last row, go to first row
      // wait to allow the pattern to be updated in the DOM, then scroll the selected row into view
      setTimeout(function(){
        Meteor.my_functions.scroll_selected_row_into_view();
      }, 50);
    }

    // move the column numbers to sit above the selected row
    var selected_row_index = number_of_rows - row_number;

    var new_top = $($('.row').not(".column_number")[selected_row_index]).position().top - $('.row').not(".column_number").position().top;
    $('.row.column_number').css({ top: new_top});

    Session.set('current_weave_row', row_number);

    if (Meteor.userId()) // the user is signed in
    {
      Meteor.call('set_current_weave_row', pattern_id, row_number);
    }
    else
    {
      var data = Meteor.my_functions.get_pattern_data_from_local_storage(pattern_id);
      data.current_weave_row = row_number;
      Meteor.my_functions.set_pattern_data_from_local_storage(pattern_id, data);
    }
  },
  get_pattern_data_from_local_storage: function(pattern_id)
  {
    var data = localStorage.getItem("pattern_" + pattern_id);
    if (data != null) return JSON.parse(data);
    else return {};
  },
  set_pattern_data_from_local_storage: function(pattern_id, data)
  {
    console.log("set pattern data")
    localStorage.setItem("pattern_" + pattern_id, JSON.stringify(data));
  },
  validate_row_number_input: function(index)
  {
    // index is a readable row number starting with 1 at the bottom
    // Row number must be an integer between 1 and last row
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var number_of_rows = pattern.number_of_rows;

    var new_value = parseInt(index);
    if (isNaN(new_value))
    {
      // use the current value
      //new_value = Patterns.findOne({_id: pattern_id}).current_weave_row;
      new_value = pattern.current_weave_row;
    }
    else
    {
      if (new_value < 1)
      {
        new_value = 1;
      }

      else
      {
        if (new_value > number_of_rows)
        {
          new_value = number_of_rows;
        }
      }     
    }

    return new_value;
  },
  validate_row_number_read: function(index)
  {
    // index is an array index starting with 0 at the top
    // Row number must be an integer between 0 and last row -1
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var number_of_rows = pattern.number_of_rows;

    var new_value = parseInt(index);

    if (isNaN(new_value))
    {
      new_value = 1; // start at the beginning of the pattern
    }
    else
    {
      if (new_value < 1)
      {
        new_value = 1;
      }

      else
      {
        if (new_value > number_of_rows)
        {
          new_value = number_of_rows;
        }
      }
    }

    return new_value;
  },
  ///////////////////////////////////
  // Searching
  hide_search_results: function()
  {
    patternsIndex.getComponentMethods().search("");
    usersIndex.getComponentMethods().search("");
  }
}
