Template.auto_preview.onCreated(function() {
  this.unit_width = 41.560534;
  this.unit_height = 113.08752;
  this.cell_width = 10;
  this.cell_height = 27; // this is made up
  //this.max_image_height = 200;
  this.max_image_width = 300;

  var pattern_id = Router.current().params._id;
  this.pattern_id = pattern_id;

  this.viewbox_width = function(){
    var pattern_id = Router.current().params._id;
    var number_of_tablets = Patterns.findOne({_id: pattern_id}, {fields: {number_of_tablets: 1}}).number_of_tablets;

    //var number_of_tablets = current_weaving_cells[0].length;
    return this.unit_width * number_of_tablets;
  };

  this.viewbox_height = function(){
    var number_of_rows = current_weaving_cells.length;
    return this.unit_height * (1 + number_of_rows / 2);
  };

  this.image_width = function(){
    var number_of_tablets = current_weaving_cells[0].length;
    return this.cell_width * number_of_tablets;
    //return Math.min(width, this.max_image_width);
  };

  this.image_height = function(){
    // elements overlap by half their height
    // so total height is half their height * number of rows
    // plus another half height that sticks out the top
    var height = (1 + current_weaving_cells.length) * this.cell_height / 2;
    return height;
  };

  this.previous_style = function(scope){
    if (scope.row > 1)
    {
      var tablet = scope.tablet;
      var previous_row = scope.row - 1;
      var previous_cell = current_weaving_cells.list()[previous_row -1].list()[tablet-1];
      return current_styles.list()[previous_cell.style-1];
    }
    else
    {
      if (scope.row > 2)
      {
        var tablet = scope.tablet;
        var previous_row = scope.row - 2;
        var previous_cell = current_weaving_cells.list()[previous_row -1].list()[tablet-1];
        return current_styles.list()[previous_cell.style-1];
      }
      return;
    }
  };
});

// extendContext is used in the template to supply the helper values to the child template.
Template.auto_preview.helpers({
  updating_pattern: function() {
    //return true;
    if (Session.equals("updating_pattern", true))
      return true;

    else
      return false;
  },
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
  preview_rotation: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {preview_rotation: 1}});

    if (pattern.preview_rotation == "anticlockwise")
      return "anticlockwise";

    else
      return "clockwise";
  },
  rotation_correction: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {preview_rotation: 1}});

    var total_width = Template.instance().image_width();
    var max_width = Template.instance().max_image_width;
    var scaling = 1;

    if (total_width > max_width)
    {
      scaling = max_width / total_width;
      total_width = max_width;
    }

    if (pattern.preview_rotation == "anticlockwise")
    {
      return "margin-top: " + total_width + "px; height: 0;";
    }

    else
    {
      var total_height = Template.instance().image_height() * scaling;
      return "margin-left: " + total_height + "px; height: " + total_width + "px; ";
    }
  },
  spinner_style: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {preview_rotation: 1}});

    var total_width = Template.instance().image_width();
    var max_width = Template.instance().max_image_width;
    var scaling = 1;

    if (total_width > max_width)
    {
      scaling = max_width / total_width;
      total_width = max_width;
    }

    var total_height = Template.instance().image_height() * scaling;

    if (pattern.preview_rotation == "anticlockwise")
    {
      return "margin-top: -" + total_width + "px; height: " + total_width + "px;" + "width: " + total_height + "px;";
    }

    else
    {
      return "margin-left: -" + total_height + "px; height: " + total_width + "px; " + "width: " + total_height + "px;";
    }
  },
  viewbox_width: function() {
    return Template.instance().viewbox_width();
  },
  viewbox_height: function() {
    return Template.instance().viewbox_height();
  },
  total_width: function() {
    //console.log("width is " + Template.instance().image_width());
    return Math.min(Template.instance().image_width(), Template.instance().max_image_width);
  },
  total_height: function() {
    return Template.instance().image_height();
  },
  ////////////////////////
  // New Thing
  preview_cell: function() {
    var pattern_id = Router.current().params._id;
    return WeavingCells.find({pattern_id: pattern_id});
  },
  data: function() {
    var data = {};
//console.log("running data");
    // position of element
    data.x_offset = ((this.tablet - 1) * Template.instance().unit_width);
    var number_of_rows = current_weaving_cells.length;
    var row_up = number_of_rows - this.row;
    data.y_offset = ((row_up) * Template.instance().unit_height/2);
 

    var forward = "m0.51 111.54 40.545-55v-55l-40.545 55z";
    var backward = "m41.05 111.54-40.545-55v-55l40.545 55z";
    var triangle_right = "m0.51 1.54-0.0006 110 40.545-55z";
    var triangle_left = "m41.18 1.54 0.0006 110-40.545-55z";

    var previous_style = Template.instance().previous_style(this);
//console.log("running data 2");
    // shape
    if (this.style.charAt(0) == "S")
    {
      console.log("special style");

        var style_number = parseInt(this.style.substring(1));
        var style = current_special_styles.list()[style_number-1];

        if (typeof style === "undefined")
            return data;

        var cell_style = {
          background_color: style.background_color,
          image: style.image,
          style: style.style
        }
     //  TODO implement special styles
    }
    else // regular style
    {
      var style_number = parseInt(this.style);
      var style = current_styles.list()[style_number-1];

      switch(style.warp)
      {
        case "forward":
        //console.log("here forward");
          if (!previous_style)
          {
            data.shape = forward;
          }
          else
          {
            // if previous style has no warp, go back until you find one
            // same for 'backward'
            // if no warp ever found, use current
            if (previous_style.warp == "backward")
              data.shape = triangle_left;


            else
              data.shape = forward;
          }
          
          break;

        case "backward":
          if (!previous_style)
            data.shape = backward;

          else {
            if (previous_style.warp == "forward")
              data.shape = triangle_right;

            else
              data.shape = backward;
          }
          break;

          default:
            if (!previous_style)
            return data;

            // regular style with no warp is assumed to be a fload
            // repeat previous 
            if (previous_style.warp == "backward")
              data.shape = backward;

            if (previous_style.warp == "forward")
              data.shape = forward;
            // go back to the most recent cell that has a thread and draw that
            
      }
    }

    // colour
    if ((style.warp == "forward") || (style.warp == "backward"))
    {
      data.color = style.line_color;
    }

    else if (typeof previous_style !== "undefined")
    {
      if ((previous_style.warp == "forward") || (previous_style.warp == "backward"))
        data.color = previous_style.line_color;
    }

    return data;
  }
 });

Template.auto_preview.events({
  "click .rotate_preview": function () {
      Meteor.call("rotate_preview", this._id);
  }
});

/* next
Investigate issue with delete tablet
Consider position of preview - hard to see and edit at present
use if in template to choose which svg graphic based on thread, next and previous
max width, max length
repeat if short pattern
specials
if no thread show weft
save as png? Only regenerate when pattern edited
add svg for vertical weft * 3?
Use auto preview as Home page preview if no photo chosen
  */
