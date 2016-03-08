Template.auto_preview.onCreated(function() {
  this.unit_width = 41.560534;
  this.unit_height = 113.08752;
  this.params = {
    forward: {
      translate_x: 0,
      translate_y: 0

      /*translate_x: -379.22,
      translate_y: -415.82*/
    }
  }
  this.cell_width = 10;
  //this.cell_height = 30;

  var pattern_id = Router.current().params._id;
  var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_rows: 1, number_of_tablets: 1}});
  this.number_of_rows = pattern.number_of_rows;
  this.number_of_tablets = pattern.number_of_tablets;
});

Template.auto_preview.helpers({

  viewbox_width: function() {
    return Template.instance().unit_width * this.number_of_tablets;
  },
  viewbox_height: function() {
    return Template.instance().unit_height * (1 + this.number_of_rows / 2);
  },
  total_width: function() {
    return Template.instance().cell_width * this.number_of_tablets;
  },
  /*total_height: function() {
    return Template.instance().cell_height;
    return Template.instance().cell_height * this.number_of_tablets;
  },*/
  fill: function() {
    return "#00FF00";
  },
  translate_x: function(shape) {
    //console.log("shape " + shape);
    var x_offset = ((this.tablet - 1) * Template.instance().unit_width);
    //console.log("offset " + x_offset);
    return x_offset;
  }
  ,
  translate_y: function(shape) {
    var row_up = Template.instance().number_of_rows - this.row;

    var y_offset = ((row_up) * Template.instance().unit_height/2);
    //console.log("offset " + y_offset);
    return y_offset;
  },
  shape: function() {
    //console.log("this " + JSON.stringify(this));
    current_weaving_cells.list()[1].list()[2]
    if (this.row > 1)
    {
      var tablet = this.tablet;
      var previous_row = this.row - 1;
      var previous_cell = current_weaving_cells.list()[previous_row -1].list()[tablet-1];
      previous_style = current_styles.list()[previous_cell.style-1];
      //previous_cell.style;

//console.log("warp " + this.warp);
//console.log("previous " + JSON.stringify(previous_cell));
//console.log("***");
      if (this.warp == "forward")
      {
        if (previous_style.warp == "backward")
          return "triangle_left";

        else
          return "forward";
      }
      else if (this.warp == "backward")
      {
        if (previous_style.warp == "forward")
          return "triangle_right";

        else
          return "backward";
      }

    }
    else
    {
      if (this.warp == "forward")
        return "forward";

      else if (this.warp == "backward")
        return "backward";
    }
  }
 });

/* next
use if in template to choose which svg graphic based on thread, next and previous
if no thread show weft
save as png?
add svg for vertical weft * 3?
Use auto preview as Home page preview
  */
