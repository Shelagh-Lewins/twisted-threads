Template.auto_preview.onCreated(function() {
  this.unit_width = 41.560534;
  this.unit_height = 113.08752;
  this.cell_width = 10;
  this.cell_height = 27; // this is made up
  this.max_image_width = 300;

  var pattern_id = Router.current().params._id;
  this.pattern_id = pattern_id;

  this.viewbox_width = function(){
    return this.unit_width * Session.get("number_of_tablets");
  };

  this.viewbox_height = function(){
    return this.unit_height * (1 + Session.get("number_of_rows") / 2);
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
});

// extendContext is used in the template to supply the helper values to the child template.
Template.auto_preview.helpers({
  /*use_stored_preview: function() {
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
  },*/
  preview_rotation: function() {
    var pattern = Patterns.findOne({ _id: Template.instance().pattern_id}, { fields: {preview_rotation: 1}});

    switch(pattern.preview_rotation)
    {
      case "left":
        return "left";
        break;

      case "up":
        return "up";
        break;

      case "right":
        return "right";
        break;

      case "down":
        return "down";
        break;

      default:
        return "left";
    }
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

    switch(pattern.preview_rotation)
    {
      case "left":
        return "margin-top: " + total_width + "px; height: 0;";

      case "up":
        return;

      case "right":
        var total_height = Template.instance().image_height() * scaling;
        return "margin-left: " + total_height + "px; height: " + total_width + "px; ";

      case "down":
        var total_height = Template.instance().image_height() * scaling;
        //return "margin-left: " + total_width + "px; height: 0; margin-top: " + total_height + "px; ";

        return "width: " + total_width + "px; position: relative; height: " + total_height + "px; ";

      default:
        return "margin-top: " + total_width + "px; height: 0;"; // left
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
    return Math.min(Template.instance().image_width(), Template.instance().max_image_width);
  },
  total_height: function() {
    return Template.instance().image_height();
  }
 });

Template.auto_preview.events({
  "click .rotate_preview": function () {
    console.log("clicked");
      Meteor.call("rotate_preview", this._id);
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
//console.log("row " + row);
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
    var cell = current_weaving_data[(row) + "_" + (tablet)];

    if (typeof cell === "undefined")
      return;

    var style_value = cell.get();

    if (typeof cell === "undefined")
      return; // may happen when rows or tablets are added or removed

    var unit_width = 41.560534;
    var unit_height = 113.08752;

    var data = {};

    // position of element
    data.x_offset = ((tablet - 1) * unit_width);

    var row_up = Session.get("number_of_rows") - row;
    data.y_offset = ((row_up) * unit_height/2);
 
    var forward = "m0.51 111.54 40.545-55v-55l-40.545 55z";
    var backward = "m41.05 111.54-40.545-55v-55l40.545 55z";
    var triangle_right = "m0.51 1.54-0.0006 110 40.545-55z";
    var triangle_left = "m41.18 1.54 0.0006 110-40.545-55z";
    var block = "m41.05 85.54h-40.545v-54.999h40.545z";
    //var forward_weft = "m41.049 35.707v20.832l-15.338 20.807h-25.205v-20.807l15.356-20.832h25.187z";
   // var backward_weft = "m0.50586 35.709v20.832l15.338 20.807h25.205v-20.807l-15.356-20.832h-25.187z";

    var previous_style;

    if (row > 1)
    {
      var previous_style_number = current_weaving_data[(row-1) + "_" + (tablet)].get();

      if (typeof previous_style_number !== "undefined")
        previous_style = current_styles.list()[previous_style_number-1];
    }

    // shape
    if (style_value.toString().charAt(0) == "S")
    {
      var style_number = parseInt(style_value.substring(1));
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
      var style_number = style_value;
      var style = current_styles.list()[style_number-1];

      switch(style.warp)
      {
        case "forward":
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

        case "none": // a regular style with no warp is assumed to be a brocade pattern
          data.shape = block;
          data.color = style.background_color;
          break;

        case "forward_empty": // leave empty to show weft
          break;

        case "backward_empty": // leave empty to show weft
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
    }

    // colour
    if ((style.warp == "forward") || (style.warp == "backward"))
      //|| (style.warp == "forward_empty")|| (style.warp == "backward_empty"))
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
//console.log("color is " + data.color);
    return data;
  }
});

