UI.registerHelper('tablet_indexes', function() {
    var pattern_id = this._id;
    var pattern = Patterns.findOne({_id: pattern_id});
    var tablet_indexes = [];

    for (var i=0; i<pattern.number_of_tablets; i++)
    {
      tablet_indexes.push(i+1);
    }

    return tablet_indexes;
});

UI.registerHelper('row_indexes', function() {
    var pattern_id = this._id;
    var pattern = Patterns.findOne({_id: pattern_id});

    var row_indexes = [];
    for (var i=0; i<pattern.number_of_rows; i++)
    {
      row_indexes.unshift(i+1); // row 1 at bottom of page
    }

    return row_indexes;
});

UI.registerHelper('weaving_row', function(row) {
    var pattern_id = Router.current().params._id;

    return Weaving.find({ $and: [{pattern_id: pattern_id, row:row}]}, {sort: {"tablet": 1}}).fetch();
});

//////////////////////////
// Tablets
UI.registerHelper('hole_indexes', function() {
  return [4,3,2,1]; // row 1 at bottom of page
});

UI.registerHelper('threading_hole', function(hole) {
  var pattern_id = Router.current().params._id;

    return Threading.find({ $and: [{pattern_id: pattern_id, hole:hole}]}, {sort: {"tablet": 1}}).fetch();
});

UI.registerHelper('hole_label', function(hole) {
  if (Session.equals("db_ready", false))
        return;

    var pattern_id = Router.current().params._id;

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
    if (Session.equals('selected_style', this.style))
        return "selected";
  });

  UI.registerHelper('cell_style', function() {
    var cell_style = {}; 

    var pattern_id = Router.current().params._id;
    var style_number = this.style;
    var pattern_style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: style_number}]});

    if (typeof pattern_style === "undefined")
        return;
      
    cell_style.style = style_number;
    cell_style._id = this._id;

    // background color
    if (typeof pattern_style.background_color !== "undefined")
      cell_style.background_color = pattern_style.background_color;

    else
      cell_style.background_color = "#FFFFFF";

    // line color
    if (typeof pattern_style.line_color !== "undefined")
      cell_style.line_color = pattern_style.line_color;

    else
      cell_style.line_color = "#000000";

    // is the background color dark?
    if (pattern_style.is_dark)
      cell_style.is_dark = "is_dark";

    // forward stroke?
    if (pattern_style.forward_stroke)
      cell_style.forward_stroke = "forward_stroke";

    // backward stroke?
    if (pattern_style.backward_stroke)
      cell_style.backward_stroke = "backward_stroke";

    return cell_style;
  });

