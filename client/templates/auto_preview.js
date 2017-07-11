Template.auto_preview.onCreated(function() {
  this.unit_width = 41.560534;
  this.unit_height = 113.08752;
  this.cell_width = 10;
  this.cell_height = 27; // this is made up
  this.max_image_width = 300;

  var pattern_id = Router.current().params._id;
  this.pattern_id = pattern_id;
  var pattern = Patterns.findOne({ _id: pattern_id}, { fields: {preview_rotation: 1}});

  if (typeof pattern !== "undefined")
  {
    if (typeof pattern.preview_rotation === "undefined") // old pattern
    {
      Meteor.call('rotate_preview', pattern_id); // switch to 'left and save'
      Session.set("preview_rotation", "left");
    }
    else
    {
      Session.set("preview_rotation", pattern.preview_rotation);
    }
  }

  this.viewbox_width = function(){
    return this.unit_width * Session.get("number_of_tablets");
  };

  this.viewbox_height = function(){
    return this.unit_height * ((Session.get("number_of_rows") + 1) / 2);
  };

  this.repeat_viewbox_height = function(){
    if (typeof Session.get("number_of_repeats") === "undefined")
      return 0; // not ready

    var height = this.viewbox_height();
    var pattern = Patterns.findOne({ _id: this.pattern_id});

    if (typeof pattern === "undefined")
        return;

    if (pattern.simulation_mode == "auto")
    {
      height *= Session.get("number_of_repeats");
      height -= (Session.get("number_of_repeats") - 1) * (this.unit_height / 2);
    }

    return height;
  };

  this.scaling = function(){
    // preview now scrolls instead of scaling, but the code is here in case this changes
    //var total_width = this.image_width();
    //var max_width = this.max_image_width;
    var scaling = 1;
/*
    if (total_width > max_width)
    {
      scaling = max_width / total_width;
      total_width = max_width;
    }*/
//console.log("scaling " + scaling);

    return scaling;
  };

  this.total_height = function() { // for parent element css
    if (typeof Session.get("number_of_repeats") === "undefined")
      return 0; // not ready

    var pattern = Patterns.findOne({ _id: this.pattern_id});
    if (typeof pattern === "undefined")
        return;
      
    //var total_height = this.image_height() * this.scaling() * Session.get("number_of_repeats");
    var total_height = this.image_height() * Session.get("number_of_repeats");

    if (pattern.edit_mode == "simulation")
      if (pattern.simulation_mode == "auto")
        total_height -= (Session.get("number_of_repeats") - 1) * this.cell_height/2;

    return total_height;
  };

  this.image_width = function(){
    return this.cell_width * Session.get("number_of_tablets");
  };

  this.image_height = function(){
    // elements overlap by half their height
    // so total height is half their height * number of rows
    // plus another half height that sticks out the top
    var height = (1 + Session.get("number_of_rows")) * this.cell_height / 2;
    return height;
  };

  this.sim_holder_height = function(){
    var sim_holder_height = this.image_height() * Session.get("number_of_repeats");

    sim_holder_height -= (Session.get("number_of_repeats") - 1) * this.cell_height/2;

    return sim_holder_height + 36; // 36 = width of tablets showing direction of weaving
  };

  this.set_svg_style = function() {
    // svg style doesn't seem to be saved in the svg image that is stored with the pattern for the Home page, so set it now to correct for rotation
    var that = this;

    setTimeout(function() {
      var svg_style;

      switch(Session.get("preview_rotation"))
      {
        case "right":
          svg_style = "left: " + that.total_height() + "px;";
          break;

        case "left":
          svg_style = "top: " + that.image_width() + "px;";
          break;
      }
      if (typeof $('.auto_preview svg')[0] === "undefined")
      {
        setTimeout(function() {
          that.set_svg_style();
        })
      }
      else
        $('.auto_preview svg').attr("style", svg_style);
    }, 5);
  };

  this.set_svg_style();
});

// extendContext is used in the template to supply the helper values to the child template.
Template.auto_preview.helpers({
  use_stored_preview: function() {
    if (Session.equals('edited_pattern', true))
    {
      return false;
    }
    else
    {
      if(Patterns.findOne({ _id: Template.instance().pattern_id, "auto_preview": {$exists: true}}))
        return true;

      else
        return false;
    }    
  },
  stored_preview: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {auto_preview: 1}});
    if (typeof pattern.auto_preview === "string")
      return pattern.auto_preview;
  },
  repeats: function() {
    var repeats = [];

    for (var i=0; i<Session.get("number_of_repeats"); i++)
    {
      repeats.push(i);
    }
    return repeats;
  },
  repeat_offset: function() {
    var height = Template.instance().unit_height * ((Session.get("number_of_rows") +1) / 2);
    var offset = parseFloat(this) * (height - (0.5 * Template.instance().unit_height));

    return offset;
  },
  repeat_border_offset: function()
  {
    var total_height = Template.instance().image_height();
    //var total_height = Template.instance().image_height() * Template.instance().scaling();

    total_height -=  Template.instance().cell_height/2;

    return Math.ceil(total_height * this + Template.instance().cell_height/4);
  },
  weft_color: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {weft_color: 1}});

    return pattern.weft_color;
  },
  show_tablets: function() {
    if (Session.equals('view_pattern_mode', "charts") || Session.equals('view_pattern_mode', "summary"))
      return "show_tablets";
  },
  tablet_position: function() {
    // which hole is currently in position A?
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1, position_of_A: 1}});

    if (typeof pattern === "undefined")
        return;

    if (pattern.edit_mode == "simulation")
    {
      var position_of_A = JSON.parse(pattern.position_of_A);
      var labels = ["A", "B", "C", "D"];
      return labels[position_of_A[this-1]];
    }
  },
  preview_rotation: function() {
    return Session.get("preview_rotation");
  },
  preview_style: function() {
    if (Session.get("preview_rotation") == "right")
      return "width: " + (Template.instance().sim_holder_height()) + "px; min-width: 600px; position: relative;"; // extra px to allow space for tablets

    else if (Session.get("preview_rotation") == "left")
      return "width: " + (Template.instance().sim_holder_height()) + "px;"; // extra px to allow space for tablets
  },
  rotation_correction: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {edit_mode: 1, simulation_mode: 1}});

  Template.instance().set_svg_style();

  if (typeof pattern === "undefined")
        return;

    var total_width = Template.instance().image_width();

    var total_height = Template.instance().image_height() * Session.get("number_of_repeats");
    //var total_height = Template.instance().image_height() * Template.instance().scaling() * Session.get("number_of_repeats");

        if (pattern.edit_mode == "simulation")
          if (pattern.simulation_mode == "auto")
            total_height -= (Session.get("number_of_repeats") - 1) * Template.instance().cell_height/2;

    switch(Session.get("preview_rotation"))
    {
      case "left":
        return "height: "  + Template.instance().image_width() + "px; width: "  + total_height + "px;";

      case "right":
        return "height: " + Template.instance().image_width() + "px; width: " + total_height + "px; position: relative;";
    }
  },
  viewbox_width: function() {
    return Template.instance().viewbox_width();
  },
  viewbox_height: function() {
    return Template.instance().viewbox_height();
  },
  repeat_viewbox_height: function() {
    return Template.instance().repeat_viewbox_height();
  },
  total_width: function() {
    if (Session.get("number_of_rows") == 0)
      return 0;

    else
      //return Math.min(Template.instance().image_width(), Template.instance().max_image_width);
    return Math.min(Template.instance().image_width());
  },
  total_height: function() {
    return Template.instance().image_height();
  }
 });

Template.auto_preview.events({
  "click .rotate_preview": function () {
    Session.set('edited_pattern', true);
    Meteor.call("rotate_preview", this._id);

    switch(Session.get("preview_rotation"))
    {
      case "left":
        Session.set("preview_rotation", "right");
        break;

      case "right":
        Session.set("preview_rotation", "left");
        break;
    }
    Template.instance().set_svg_style();
  }
});

Template.auto_preview_weft.helpers({
  data: function(row)
  {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var number_of_tablets = pattern.number_of_tablets;

    var data = {};

    var unit_height = 113.08752;

    var row_up = Session.get("number_of_rows") - row;
    data.y_offset = ((row_up) * unit_height/2);

    data.color = weft_color.get();
    data.scale = number_of_tablets;

    return data;
  }
})

Template.auto_preview_element.helpers({
  data: function(row, tablet) {
    // pattern info used for simulation pattern
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { edit_mode: 1, simulation_mode: 1, manual_weaving_threads: 1}});

    if (typeof pattern === "undefined")
        return;

    var cell = current_weaving_data[(row) + "_" + (tablet)];

    if (typeof cell === "undefined")
      return;

    var style_value = cell.get();

    if (typeof cell === "undefined")
      return; // may happen when rows or tablets are added or removed

    var unit_width = 41.560534;
    var unit_height = 113.08752;

    var style;
    var previous_style = {};
    var data = {};

    // position of element
    data.x_offset = ((tablet - 1) * unit_width);

    var row_up = Session.get("number_of_rows") - row;
    data.y_offset = ((row_up) * unit_height/2);
 
    // regular styles are a single simple path so can be returned as data
    var forward = "m0.51 111.54 40.545-55v-55l-40.545 55z";
    var backward = "m41.05 111.54-40.545-55v-55l40.545 55z";
    var triangle_right = "m0.51 1.54-0.0006 110 40.545-55z";
    var triangle_left = "m41.18 1.54 0.0006 110-40.545-55z";
    var block = "m41.05 85.54h-40.545v-54.999h40.545z";
    var v_left = "m29.922 85.614h-29.491v-55.147h29.491z";
    var v_right = "m41.121 85.614h-29.491v-55.147h29.491z";
    var v_center = "m35.721 85.614h-29.491v-55.147h29.491z";

    style = Meteor.my_functions.find_style(style_value);

    // find previous style
    if (row == 1)
    {
      if (Session.get("number_of_repeats") > 1)
        // for first row, use last row as previous row so pattern repeats correctly
        var previous_style_value = current_weaving_data[Session.get("number_of_rows") + "_" + (tablet)].get();
      
      else
        var previous_style_value = current_weaving_data[row + "_" + (tablet)].get();
    }
      
    else
      var previous_style_value = current_weaving_data[(row-1) + "_" + (tablet)].get();

    var previous_style = Meteor.my_functions.find_style(previous_style_value);
      
    if (style.name == "idle") // idle tablet, use previous row
    {
      style = Meteor.my_functions.find_style(previous_style_value);

      if (row == 1) // idle tablet in first row
      {
        var show_empty = true; // default is to leave the cell blank

        if (pattern.edit_mode == "simulation")
          if (pattern.simulation_mode == "manual")
            // find the previous thread from the weaving threads
            if (Router.current().route.getName() == "pattern")
            {
              // check it's not empty hole
              if (!Meteor.my_functions.is_style_special(weaving_chart_style))
              {
                show_empty = false;

                // show the thread in hole D, that is row 4 of threading chart   
                var style_value = current_threading_data["4_" + tablet].get();

                var weaving_chart_style = 7 + 4*(style_value - 1);
                var orientation = current_orientation[tablet-1].orientation;

                if (orientation == "S")
                  weaving_chart_style += 1;
                else
                  weaving_chart_style += 2;
                
                style = Meteor.my_functions.find_style(weaving_chart_style);
              }
            }

        if (show_empty)
            return data; // we don't know what the previous thread was just from the weaving chart, so leave it empty.
      }
    }

    data.special = style.special;

    // has the twining direction reversed?
    var reversal = false;
    if ((style.warp == "forward") && (previous_style.warp == "backward"))
      reversal = true;

    if ((style.warp == "backward") && (previous_style.warp == "forward"))
      reversal = true;

    // shape
    if (style.special)
    {
      if (pattern.edit_mode == "simulation")
      {
        //console.log("simulation_mode " + pattern.simulation_mode);
        if (pattern.simulation_mode == "manual") // auto patterns only ever have 1 turn
        {
          if (typeof pattern.manual_weaving_threads[row-1] !== "undefined") // in case rebuilding array
          {
            //console.log("here " + pattern.manual_weaving_threads.length);
            var thread_colors = [];
            for (var i=0; i<4; i++)
            {
              thread_colors[i] = current_threading_data[(i+1) + "_" + tablet].get();
            }
            //console.log("row " + row);
            //console.log("tablet " + tablet);
            //console.log("there " + typeof pattern.manual_weaving_threads[row-1]);
            var thread_to_show = pattern.manual_weaving_threads[row-1][tablet-1];
            //console.log("thread_colors " + thread_colors);
            //console.log("thread to show " + thread_to_show);

            // TODO
            // set data.color to line color of style in hole
          }
        }
      }

      switch (style.name)
      {
        case "forward_2":
        case "forward_2_gray":
        //console.log("color 1 " + style.line_color);
          if(reversal)
          {
            data.shape = "triangle_left_2";
            //data.color = style.line_color;
          }
          else
          {
            data.shape = "forward_2";
            //data.color = style.line_color;
          }
          break;

        case "backward_2":
        case "backward_2_gray":
          if(reversal)
            data.shape = "triangle_right_2";
          else
            data.shape = "backward_2";
          break;

        case "forward_3":
        case "forward_3_gray":
          if(reversal)
            data.shape = "triangle_left_3";
          else
            data.shape = "forward_3";
          break;

        case "backward_3":
        case "backward_3_gray":
          if(reversal)
            data.shape = "triangle_right_3";
          else
            data.shape = "backward_3";
          break;

        case "forward_4":
        case "forward_4_gray":
           if(reversal)
            data.shape = "triangle_left_4";
          else
            data.shape = "forward_4";
          break;

        case "backward_4":
        case "backward_4_gray":
          if(reversal)
            data.shape = "triangle_right_4";
          else
            data.shape = "backward_4";
          break;
      }  
      return data;
    }

    switch(style.warp)
    {
      case "forward":
        if (reversal)
          data.shape = triangle_left;

        else
          data.shape = forward;

        break;

      case "backward":
        if (reversal)
          data.shape = triangle_right;

        else
          data.shape = backward;

        break;

      case "none": // a regular style with no warp is assumed to be a brocade pattern
        data.shape = block;
        data.color = style.background_color;
        break;

      case "forward_empty": // leave empty to show weft
        break;

      case "backward_empty": // leave empty to show weft
        break;

      case "v_left": // Laceby style pickup warp at left
        data.shape = v_left;
        break;

      case "v_right": // Laceby style pickup warp at right
        data.shape = v_right;
        break;

      case "v_center": // Laceby style pickup warp at center
        data.shape = v_center;
        break;

      default:
        if (!previous_style)
          return data;

        // regular style with no warp is assumed to be a float
        // repeat previous 
        if (previous_style.warp == "backward")
          data.shape = backward;

        if (previous_style.warp == "forward")
          data.shape = forward;
        // go back to the most recent cell that has a thread and draw that
        break;
    }

    // colour
    if ((style.warp == "forward")
      || (style.warp == "backward")
      || (style.warp == "v_left")
      || (style.warp == "v_right")
      || (style.warp == "v_center"))
    {
      data.color = style.line_color;
    }

    else if ((style.warp == "forward_empty") || (style.warp == "backward_empty"))
    {
      // leave empty to show weft
    }

    else if (typeof previous_style !== "undefined")
    {
      if ((previous_style.warp == "forward") || (previous_style.warp == "backward"))
        data.color = previous_style.line_color;
    }

    return data;
  }
});

