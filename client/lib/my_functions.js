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
      }, 250);
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

    var number_of_rows = pattern.number_of_rows;
    var number_of_tablets = pattern.number_of_tablets;

    // Basic pattern properties
    pattern_obj.name = pattern.name;
    pattern_obj.description = pattern.description;

    // Styles
    var styles = Styles.find({pattern_id: pattern_id}, {sort: {"style": 1}}).fetch();
    pattern_obj.styles = [];

    styles.forEach(function(style) {
      var obj = {};
      obj.background_color = style.background_color;
      obj.line_color = style.line_color;
      obj.forward_stroke = style.forward_stroke;
      obj.backward_stroke = style.backward_stroke;
      pattern_obj.styles.push(obj);
    });

    // Orientation of tablets
    pattern_obj.orientation = Orientation.find({pattern_id: pattern_id}, {sort: {"tablet": 1}}).map(function(tablet){return tablet.orientation});

    // Threading of tablet holes
    pattern_obj.threading = [];

    for (var i=0; i<4; i++) // each tablet has 4 holes
    {
      // find the style of this hole for each tablet
      var hole = Threading.find({$and: [{pattern_id: pattern_id}, {hole: i+1}]}, {sort: {"tablet": 1}}).map(function(hole){return hole.style});
      pattern_obj.threading.push(hole);
    }

    // Weaving chart
    pattern_obj.weaving = [];

    for (var i=0; i<number_of_rows; i++)
    {
      var row = Weaving.find({$and: [{pattern_id: pattern_id}, {row: i+1}]}, {sort: {"tablet": 1}}).map(function(cell){return cell.style});
      //console.log("new row " + row);
      pattern_obj.weaving.push(row);
    }

    return pattern_obj;

    ///////////////////////////
    // Example JSON data for pattern
    /*
    {
    name: "my patttern",
    description: "This is a pattern",
    orientation: ["S", "Z", "S", "Z"], // one entry per tablet starting with tablet #1
    threading: [ // columns are tablets starting with tablet #1
      [style, style, style, style, style, style], // hole A
      [style, style, style, style, style, style], // hole B
      [style, style, style, style, style, style], // hole C
      [style, style, style, style, style, style], // hole D
    ],

    weaving: [
      [style, style, style, style, style, style], // row 0
      [style, style, style, style, style, style], // row 1
      [style, style, style, style, style, style], // row 2
      [style, style, style, style, style, style], // row 3
      [style, style, style, style, style, style] // row 4
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
    var name = Patterns.findOne({_id: pattern_id}).name;

    //Meteor.my_functions.start_activity_indicator("Copying pattern " + "'" + name + "' <br/>please wait...");

    // get the JSON data
    var data = Meteor.my_functions.export_pattern_to_json(pattern_id)

    // use it to create a new pattern
    var options = {
      name: name + " (copy)",
      data: data
    };
    Meteor.call('new_pattern_from_json', options, function(error, result){
      // automatically view new pattern
      //Meteor.my_functions.stop_activity_indicator();

      if (error)
      {
        console.log("error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        Router.go('pattern', { _id: result });
      }
      //Meteor.my_functions.set_selected_pattern(result);
      //Meteor.my_functions.set_view('view_pattern');
    });
  },
  new_pattern: function(name)
  {
    var message = "Creating pattern<br/>please wait...";
    if (typeof name !== "undefined")
      message = "Creating pattern '" + name + "'<'br/>please wait...";

    //Meteor.my_functions.start_activity_indicator("Creating pattern<br/>please wait...");

    if ((name=="") || (typeof name === "undefined"))
      var name="New pattern";

    var options = {
      name: name,
      filename: 'default_turning_pattern.json'
    };

    Meteor.call('new_pattern_from_json', options, function(error, result){
      // automatically view new pattern
      if (error)
      {
        console.log("error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        Router.go('pattern', { _id: result });
      }
      /*Meteor.my_functions.set_selected_pattern(result);
      Meteor.my_functions.set_view('view_pattern');*/
    });
  },
  import_pattern_from_file: function(filename) {
    // pattern file should be in the 'private' folder
    //Meteor.my_functions.start_activity_indicator("Importing pattern from file '" + filename + "'<br/>please wait...");

    var options = {
      filename: filename
    };
    Meteor.call("new_pattern_from_json", options, function(error, result){
      // automatically view new pattern
      if (result == -1)
      {
        /*setTimeout(function(){
          Meteor.my_functions.start_activity_indicator("Unable to load file " + filename);
          setTimeout(function(){ Meteor.my_functions.stop_activity_indicator(); }, 3000);
        }, 2000);*/
    // TODO show error if unable to create pattern //
      }
      else
      {
        if (error)
        {
          console.log("error running new_pattern_from_json: " + error.reason);
        }
        else
        {
          Router.go('pattern', { _id: result });
        }
      /*Meteor.my_functions.set_selected_pattern(pattern_id);
        Meteor.my_functions.set_view('view_pattern');*/
      }
    });
  },
  import_pattern_from_json: function(data) {
    // pattern file should be in the 'private' folder
    //Meteor.my_functions.start_activity_indicator("Importing pattern '" + data.name + "'<br/>please wait...");

    var options = {
      name: data.name,
      data: data
    };
    Meteor.call('new_pattern_from_json', options, function(error, result){
      // automatically view new pattern
      //Meteor.my_functions.stop_activity_indicator();
      /*Meteor.my_functions.set_selected_pattern(result);
      Meteor.my_functions.set_view('view_pattern');*/
      if (error)
      {
        console.log("error running new_pattern_from_json: " + error.reason);
      }
      else
      {
        Router.go('pattern', { _id: result });
      }
    });
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
        var pattern_id = recent_patterns[i]
        if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
            recent_patterns.splice(i, 1);
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
  toggle_edit_name: function(){
    // the user has clicked "Edit name" in view_pattern. The button toggles between "Edit name" and "Done".
    //console.log("edit name");
    var new_value = !Session.get('editing_pattern_name');
    Session.set('editing_pattern_name', new_value);

    if (Session.equals('editing_pattern_name', true))
    {
    // give the input time to be rendered before attempting to focus on it
      setTimeout(function(){$('#pattern_name_input').focus()}, 10);
    }
    else
    {
      var pattern_id = Router.current().params._id;
      var new_name = $('#pattern_name_input').val();
      Meteor.call('update_pattern_name', pattern_id, new_name);
    }
   setTimeout(function(){ Meteor.my_functions.resize_page(); }, 50);
  },
  toggle_edit_description: function(){
    var new_value = !Session.get('editing_pattern_description');
    Session.set('editing_pattern_description', new_value);

    if (Session.equals('editing_pattern_description', true))
    {
      setTimeout(function(){$('#pattern_description_input').focus()}, 50);
    }
    else
    {
      var pattern_id = Router.current().params._id;
      var new_description = $('#pattern_description_input').val();
      Meteor.call('update_pattern_description', pattern_id, new_description);
    }
    setTimeout(function(){ Meteor.my_functions.resize_page(); }, 0);
  },
  ///////////////////////////////
  // Color pickers
  initialize_background_color_picker: function()
  {
    // Set the #background_colorpicker to the selected style's background colour
    var selected_style = Session.get("selected_style");
    var pattern_id = Router.current().params._id;

    //if (Patterns.findOne({_id: pattern_id}) == null)
    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
    {
      setTimeout(function(){Meteor.my_functions.initialize_background_color_picker(); }, 10);
    }
    else
    {
      var selected_background_color = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]}).background_color;
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
          Meteor.call('edit_style', pattern_id, selected_style, options);

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
    var pattern_id = Router.current().params._id;

    var selected_line_color = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]}).line_color;
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
        Meteor.call('edit_style', pattern_id, selected_style, options);

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
    var pattern_id = Router.current().params._id;

    // Background color picker
    var selected_background_color = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]}).background_color;

    $("#background_colorpicker").spectrum("set", selected_background_color);

    // Line color picker
    var selected_line_color = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: selected_style}]}).line_color;

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

    // make sure scroll is top left
    $('#width').scrollLeft(0);
    $('#width').scrollTop(0);
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
        container.scrollTop( scrollTo.offset().top - container.offset().top + container.scrollTop() );
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

    //if (typeof Patterns.findOne({_id: pattern_id}) === "undefined")
      //return index;

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
  }
}
