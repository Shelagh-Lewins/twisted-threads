UI.registerHelper('tablet_indexes_reverse', function() {
  var tablet_indexes = [];
  for (var i=Session.get("number_of_tablets"); i>=1; i--)
  {
    tablet_indexes.push(i);
  }
  return tablet_indexes;
});

UI.registerHelper('tablet_indexes', function() {
  var tablet_indexes = [];
  for (var i=1; i<=Session.get("number_of_tablets"); i++)
  {
    tablet_indexes.push(i);
  }
  return tablet_indexes;
});

UI.registerHelper('row_indexes', function() {
  // row 1 is at bottom of chart
  var row_indexes = [];
  for (var i=Session.get("number_of_rows"); i>=1; i--)
  {
    row_indexes.push(i);
  }
  return row_indexes;
});

//////////////////////////
// Tablets
UI.registerHelper('hole_indexes', function() {
  return [4,3,2,1]; // row 1 at bottom of page
});

UI.registerHelper('hole_label', function(hole) {
    // holes are numbered 1, 2, 3, 4
    var labels = ["A", "B", "C", "D"];
    return labels[hole-1];
});

///////////////////////////
// Helpers for styles
UI.registerHelper('style_orientation', function(orientation) {
  if (orientation == "Z")
      return "orientation_z";

  else
      return "orientation_s";
});

UI.registerHelper('is_selected_style', function() {
  var special = false;

  if (typeof this.style === "string")
    if (this.style.charAt(0) == "S")
      special = true;

  if (special)
  {
    if (Session.equals('selected_special_style', this.style))
      return "selected";
  }
  else
  {
    if (Session.equals('selected_style', this.style))
      return "selected";
  }
});

UI.registerHelper('weaving_cell_data', function(row, tablet, type) {
  // row, tablet are used for pattern cells and tablets: for tablets, "row" is really "hole"
  var data = {};
  var style_ref;

  if (type == "styles")
  {
    style_ref = this.style;
    data.style = style_ref;
    if ($('#width').hasClass("simulation"))
      data.tooltip = "Thread colour";
  }
  else if (type == "special_styles")
  {
    style_ref = this.style;
    if ($('#width').hasClass("simulation"))
      data.tooltip = "Empty hole";
  }
  else if (type == "threading")
  {
    var cell = current_threading_data[(row) + "_" + (tablet)];
    if (typeof cell === "undefined")
    {
      return;
    }
    data.tablet = tablet;
    data.hole = row;
    style_ref = cell.get();

    // for simulation patterns, map styles to show thread direction
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, number_of_tablets: 1}});

    if (typeof pattern === "undefined")
        return;

    if (pattern.edit_mode == "simulation")
    {
      var mapped_styles = Meteor.my_functions.map_weaving_styles(style_ref);
      if (current_orientation[this.tablet-1].orientation == "S")
        style_ref = mapped_styles[0];
      else
        style_ref = mapped_styles[1];
    }
  }
  else // weaving cell
  {
    var cell = current_weaving_data[(row) + "_" + (tablet)];
    if (typeof cell === "undefined")
    {
      return;
    }

    data.tablet = tablet;
    data.row = row;
    style_ref = cell.get();
  }

  if (style_ref == null)
  {
    // pattern has become corrupted, show a default style so the user can fix it
    style_ref = 1;
  }
    

  if (style_ref.toString().charAt(0) == "S") // special style
  {
    var style_number = parseInt(style_ref.substring(1));
    var style = current_special_styles.list()[style_number-1];

    if (typeof style === "undefined")
        return data;

    data.background_color = style.background_color;
    data.image = style.image;
    data.style = style.style;
    data.special_style = true;
    data.tablet = tablet;
    data.row = row;
  }
  else // regular style
  {
    var style_number = parseInt(style_ref);
    var style = current_styles.list()[style_number-1];

    data.warp = style.warp;
    data.line_color = style.line_color;
    data.background_color = style.background_color;
  }

  return data;
});




