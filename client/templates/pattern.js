UI.registerHelper('tablet_indexes', function() {
    var pattern_id = this._id;
    var pattern = Patterns.findOne({_id: pattern_id});
    if (typeof pattern === "undefined") // avoid error if user signs out while viewing a private  pattern
      return;

    var tablet_indexes = [];

    for (var i=0; i<pattern.number_of_tablets; i++)
    {
      tablet_indexes.push(i+1);
    }
//console.log("helper tablet_indexes");
    return tablet_indexes;
});

UI.registerHelper('row_indexes', function() {
    var pattern_id = this._id;
    var pattern = Patterns.findOne({_id: pattern_id});
    if (typeof pattern === "undefined") // avoid error if user signs out while viewing a private  pattern
      return;

    var row_indexes = [];
    for (var i=0; i<pattern.number_of_rows; i++)
    {
      row_indexes.unshift(i+1); // row 1 at bottom of page
    }
//console.log("helper row_indexes");
    return row_indexes;
});

UI.registerHelper('weaving_row', function(row) {
    // second test - local collection for just this pattern
    //return CurrentPattern.find({row:row}, {sort: {"tablet": 1}}).fetch();
    //console.log("weaving row keys " + Object.keys(current_pattern_cells.list()[row-1].list()[0]));
    //current_pattern_cells.depend();
    //current_pattern_cells.list()[row-1].depend();
    //console.log("weaving row _id " + current_pattern_cells.list()[row-1].list()[0]._id);
    //console.log("row " + row + " length " + current_pattern_cells.list()[row-1].list().length);

    // first test
    if (typeof current_pattern_cells !== "undefined")
     // can happen if you just added a row
      if (typeof current_pattern_cells.list()[row-1] !== "undefined")
        return current_pattern_cells.list()[row-1].list(); // new and fast

    // original, works but slow
    //var pattern_id = Router.current().params._id;

//var cursor = Weaving.find({ $and: [{pattern_id: pattern_id, row:row}]}, {sort: {"tablet": 1}}).fetch();

    //return Weaving.find({ $and: [{pattern_id: pattern_id, row:row}]}, {sort: {"tablet": 1}}).fetch();
    //return Weaving.find({ $and: [{pattern_id: pattern_id, row:row}]}).fetch();
    //return cursor;
});

//////////////////////////
// Tablets
UI.registerHelper('hole_indexes', function() {
  console.log("helper hole_indexes");
  return [4,3,2,1]; // row 1 at bottom of page
});

UI.registerHelper('threading_hole', function(hole) {
  if (typeof current_threading_cells !== "undefined")
      if (typeof current_threading_cells.list()[hole-1] !== "undefined")
        return current_threading_cells.list()[hole-1].list(); 
  //var pattern_id = Router.current().params._id;
//console.log("helper threading_hole");
    //return Threading.find({ $and: [{pattern_id: pattern_id, hole:hole}]}, {sort: {"tablet": 1}}).fetch();
});

UI.registerHelper('hole_label', function(hole) {
  console.log("helper hole_label");
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
    console.log("helper style_orientation");
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
    //console.log("start cell style");
    var style = current_styles.list()[this.style-1];

    // remember to update this if style defs change
    // could use a clone but it's cleaner to control the properties directly
    var cell_style = {
      _id: this._id, // the id of the cell not the style
      background_color: style.background_color,
      backward_stroke: style.backward_stroke,
      forward_stroke: style.forward_stroke,
      line_color: style.line_color,
      style: style.style
    }
    
    //style.cell_id = this._id;
    return cell_style;
    //cell_style.html = "<li class=\"cell no_select\" ></li>";

    /*var pattern_id = Router.current().params._id;
    var style_number = this.style;
    //console.log("cell style " + Object.keys(this));
    //var cell_id = this.cell_id;
    var pattern_style = Styles.findOne({$and: [{ pattern_id: pattern_id}, {style: style_number}]});

    if (typeof pattern_style === "undefined")
        return;

      /////////////////////////////
      // test - build html here and pass it up to save template time
      cell_style.html = "<li class=\"cell no_select\" ></li>";
      //////////////////////////////
      
    cell_style.style = style_number;
    cell_style._id = this._id;
    cell_style.cell_id = this.cell_id;

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
      cell_style.backward_stroke = "backward_stroke";*/
    //console.log("end cell style");
//console.log("helper cell_style");
    return cell_style;
  });

