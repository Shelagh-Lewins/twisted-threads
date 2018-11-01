Template.row_number_bt.helpers({
  row_number_even: function(number) {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});

    if (number * 2 >= pattern.weaving_start_row) {
      //in weaving chart
      return (number * 2) - (pattern.weaving_start_row) + 1;
    } else {
      // unwoven start rows
      return number * 2;
    }
  },
  row_number_odd: function(number) {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});
    
    if (number * 2 > pattern.weaving_start_row) {
      //in weaving chart
      return (number * 2) - (pattern.weaving_start_row);
    } else {
      // unwoven start rows
      return number * 2 - 1;
    }
  },
  inactive: function(number, parity) {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});

    var inactive = "inactive";

    if (parity == "even") { // even row
      if (number * 2 >= pattern.weaving_start_row) {
        inactive = "";
      }
    } else { // odd row
      if (number * 2 > pattern.weaving_start_row) {
        inactive = "";
      }
    }

    return inactive;
  }  
});

Template.broken_twill_row.helpers({
  'inactive': function(row_number) {
    //console.log(`row_number ${row_number}`);
    //console.log(`Chart rows ${(Session.get("number_of_rows") / 2) + 1}`);
    if (row_number > Session.get("number_of_rows") / 2)
      return "inactive";

    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});
    //console.log(`weaving_start_row ${pattern.weaving_start_row}`);

    if (pattern.weaving_start_row % 2 == 0) { // even start row
      if (row_number <= (pattern.weaving_start_row) / 2)
        return "inactive";
    } else { // odd start row
      if (row_number < Math.round(pattern.weaving_start_row / 2))
        return "inactive";
    }
  },
  'first_row': function(row_number) {

    if (row_number == 1)
      return "first_row";
  },
  'half_row': function(row_number) {
    var pattern_id = Router.current().params._id;
    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});

    if (pattern.weaving_start_row % 2 == 0) { // even start row
      if (row_number == (pattern.weaving_start_row) / 2)
        return "half_row";
    }
  },
  'last_row': function(row_number) {
    if (row_number > Session.get("number_of_rows") / 2)
      return "last_row";
  }
});

UI.registerHelper('broken_twill_row_indexes', function() {
  // row 1 is at bottom of chart
  var broken_twill_row_indexes = [];

  // extra row to allow last even row to be determined
  for (var i=(Session.get("number_of_rows") / 2) + 1; i>=1; i--)
  {
    broken_twill_row_indexes.push(i);
  }
  return broken_twill_row_indexes;
});

UI.registerHelper('broken_twill_data', function(row, tablet) {
	var data = {
		tablet: tablet,
		row: row,
		long_float: this.long_float
	}
  //console.log('*****');
  //console.log(`row ${row}`);
  //console.log(`tablet ${tablet}`);

	// background or foreground colour?
	var twill_cell = current_twill_pattern_chart[(row) + "_" + (tablet)];
  if (typeof twill_cell === "undefined")
  {
    return;
  }

  var value = twill_cell.get();
  //console.log(`value ${value}`);

  if (value == ".") {
  	data.style = 2;
  } else {
  	data.style = 1;
  }

  // twill reversal?
  var twill_change_cell = current_twill_change_chart[(row) + "_" + (tablet)];
  if (typeof twill_change_cell === "undefined")
  {
    return;
  }

  value = twill_change_cell.get();

  if (value == ".") {
  	data.twill_change = false;
  } else {
  	data.twill_change = true;
  }
  // console.log(`twill reversal: ${value}`);

  // get cell background colour
  var style = current_styles.list()[data.style-1];
  data.background_color = style.background_color;

	return data;
});