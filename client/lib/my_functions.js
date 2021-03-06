Meteor.my_functions = {
	accept_click: function()
	{
		if (Session.get('change_tablets_latch'))
				return false;

			else return true;
	},
	pattern_exists: function(pattern_id)
	{
		// this is a faster check than using findOne
		// findOne() will always read + return the document if it exists. find() just returns a cursor (or not) and only reads the data if you iterate through the cursor.
		// https://blog.serverdensity.com/checking-if-a-document-exists-mongodb-slow-findone-vs-find/
		if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() > 0)
			return true;

		else
			return false;
	},
	///////////////////////
	// creating patterns
	can_create_pattern: function() {
		if (!Meteor.userId()) // must be signed in
			return false;

		var count = Patterns.find({created_by: Meteor.userId()}).count();
 
		if (Roles.userIsInRole( Meteor.userId(), 'verified', 'users' ))
		{
			if (Roles.userIsInRole( Meteor.userId(), 'premium', 'users' ))
			{
				if (count < Meteor.settings.public.max_patterns_per_user.premium)
					return true;

				else
					return false;
			}
			else
			{
				if (count < Meteor.settings.public.max_patterns_per_user.verified)
					return true;

				else
					return false;
			}
		}
		// if the user's email address is not verified, they can only create 1 pattern
		else
		{
			if (count < Meteor.settings.public.max_patterns_per_user.default)
				return true;

			else 
				return false;
		}
	},
	export_pattern_to_json: function(pattern_id) {
		// retrieve the pattern data from the database
		var pattern = Patterns.findOne({_id: pattern_id});
		if (typeof pattern === "undefined")
				return;

		var pattern_obj = {}; // JSON object to hold pattern

		pattern_obj.version = "2.03";
		// version number
		/*
			1.1 first ever
			1.11 added tags
			1.12 added weaving notes, threading notes
			1.13 added special styles
			2 replaced style.forward_stroke, style.backward_stroke with style.warp to allow more, mutually exclusive thread types
			2.01 added weft_color
			2.02 added edit_mode (simulation, freehand)
			2.03 added broken twill
		*/

		var number_of_rows = pattern.number_of_rows;
		var number_of_tablets = pattern.number_of_tablets;

		// Basic pattern properties
		pattern_obj.name = pattern.name;
		pattern_obj.edit_mode = pattern.edit_mode || "freehand"; // earlier patterns were freehand only
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
			pattern_obj.orientation[i] = current_orientation[i+1].get();
		}

		// Threading of tablet holes
		pattern_obj.threading = new Array(4);

		for (var i=0; i<4; i++)
		{
			pattern_obj.threading[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				pattern_obj.threading[i][j] = current_threading[(i+1) + "_" + (j+1)].get();
			}
		}

		// Weaving chart
		pattern_obj.weaving = new Array(number_of_rows);

		for (var i=0; i<number_of_rows; i++)
		{
			pattern_obj.weaving[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				pattern_obj.weaving[i][j] = current_weaving[(i+1) + "_" + (j+1)].get();
			}
		}

		// Weaving simulation (if edit_mode == simulation)
		// default to "simulation_mode": auto
		if (pattern.edit_mode == "simulation")
		{
			pattern_obj.simulation_mode = pattern.simulation_mode; // auto or manual
			pattern_obj.auto_turn_sequence = pattern.auto_turn_sequence; // e.g. FFFFBBBB

			pattern_obj.manual_weaving_turns = [];
			for (var i=0; i<current_manual_weaving_turns.length; i++)
			{
				pattern_obj.manual_weaving_turns[i] = current_manual_weaving_turns[i];
			}
			pattern_obj.position_of_A = JSON.parse(pattern.position_of_A);
		}

		// Broken twill
		if (pattern.edit_mode == "broken_twill")
		{
			pattern_obj.twill_change_chart = pattern.twill_change_chart;
			pattern_obj.twill_direction = pattern.twill_direction;
			pattern_obj.twill_pattern_chart = pattern.twill_pattern_chart;
			pattern_obj.weaving_start_row = pattern.weaving_start_row;

			// TODO start row and start threading chart
		}

		// weft color
		pattern_obj.weft_color = weft_color.get();

		// orientation of auto preview
		pattern_obj.preview_rotation = pattern.preview_rotation;

		return pattern_obj;

		

		///////////////////////////
		// Example JSON data for pattern
		/*
		{
		name: "my patttern",
		edit_mode: "freehand",
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

		// v 2+
		styles: [
			{
				background_color: "#FFFFFF",
				line_color: "#000000",
				warp: "forward" // "backward", "v_left", "v_center", "v_right", "none"
			}
			// more styles
		]

		// v 1
		styles: [
			{
				background_color: "#FFFFFF",
				line_color: "#000000",
				forward_stroke: true,
				backward_stroke: false
			}
			// more styles
		],
		weft_color: "#76a5af",
		preview_rotation: "left"
		// TODO add simulation pattern data

		// TODO add broken twill pattern data

		
		*/
	},
	copy_pattern: function(pattern_id)
	{
		Session.set('loading', true);
		var name = Patterns.findOne({_id: pattern_id}, {fields: {name: 1}}).name;

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
				toastr.error("Unable to copy pattern: " + error.reason);
				console.log("error running new_pattern_from_json from copy_pattern: " + error.reason);
			}
			else
			{
				Router.go('pattern', { _id: result });
				Meteor.my_functions.refresh_view_pattern(result);
			}
		});
	},
	search_result_clicked: function(_id)
	{
		// required to force preview to reload if the user searches when in a pattern
		Session.set('loading', true);
		Router.go('pattern', { _id: _id });
		setTimeout(function(){ 
			Session.set('loading', false); 
			Meteor.my_functions.refresh_view_pattern(_id);}, 
			100);
	},
	new_pattern: function(params)
	{
		Session.set('loading', true);

		var params = params || {};

		if ((params.name=="") || (typeof params.name === "undefined"))
			params.name=Meteor.my_params.default_pattern_name;

		var options = {
			edit_mode: params.edit_mode,
			number_of_tablets: params.number_of_tablets, // optional
			number_of_rows: params.number_of_rows, // optional
			name: params.name,
			twill_direction: params.twill_direction,
			data:default_pattern_data
		};

		Meteor.call('new_pattern_from_json', options, function(error, result){
			Session.set('loading', false);

			// automatically view new pattern
			if (error)
			{
				console.log("error running new_pattern_from_json from new_pattern: " + error.reason);
				toastr.error("Unable to create pattern. " + error.message);
			}
			else
			{
				
				Router.go('pattern', { _id: result, mode: "charts" });
			}
		});
	},
	delete_pattern: function(pattern_id) {
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: { name: 1}});
		var name = pattern.name;
		var r = confirm(name + "\nDo you want to delete this pattern?");

		if (r == true)
			Meteor.call('remove_pattern', pattern_id);

		return r;
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
				console.log("Unable to import pattern: " + error.message);
				toastr.error("Unable to import pattern: " + error.message);
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

							if (typeof pattern_obj.weaving_notes === "undefined")
								pattern_obj.weaving_notes = "";

							if (typeof pattern_obj.threading_notes === "undefined")
								pattern_obj.threading_notes = "Cell colour = thread colour for that hole\nX = empty hole";

								var result = Meteor.my_functions.convert_gtt_threaded_in_pattern_to_json(pattern_data, pattern_obj); // split analysis of different pattern types off for readability
								if (result.error)
									local_error = "Error converting pattern " + result.error;

								else pattern_obj = result.result;
							break;

						case "BrokenTwill":
							if (typeof pattern_obj.description === "undefined")
								pattern_obj.description = "A 3/1 broken twill pattern imported from Guntram's Tabletweaving Thingy (GTT)";

							if (typeof pattern_obj.weaving_notes === "undefined")
								pattern_obj.weaving_notes = "";

							if (typeof pattern_obj.threading_notes === "undefined")
								pattern_obj.threading_notes = "Cell colour = thread colour for that hole";
							
							var result = Meteor.my_functions.convert_gtt_3_1_twill_pattern_to_json(pattern_data, pattern_obj); // split analysis of different pattern types off for readability
								if (result.error)
									local_error = "Error converting pattern " + result.error;

								else
									pattern_obj = result.result;
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
		pattern_obj.orientation = [];
		pattern_obj.threading = [
			[], // hole A
			[], // hole B
			[], // hole C
			[] // hole D
		];
		pattern_obj.weaving = [];
		pattern_obj.styles = [];
		for (var i=0; i<32; i++)
		{
			pattern_obj.styles.push({
				background_color: "#FFFFFF",
				line_color: "#000000",
				warp: "none"
			});
		}

		// build threading chart and palette colors
		var result = Meteor.my_functions.analyse_gtt_colors(pattern_data, pattern_obj, 8);
		//pattern_obj = result.pattern_obj;
		var number_of_tablets = result.number_of_tablets;
		var unique_colors_list = result.unique_colors_list;
		var tablet_colors = result.tablet_colors;

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

			// S, turn forwards = forward warp, white bg
			pattern_obj.styles[style_start] = {
				background_color: "#FFFFFF",
				line_color: line_color,
				warp: "forward"
			};

			// Z, turn forwards = backward warp, white bg
			pattern_obj.styles[style_start + 1] = {
				background_color: "#FFFFFF",
				line_color: line_color,
				warp: "backward"
			};

			// S, turn backwards = backward warp, grey bg
			pattern_obj.styles[style_start + 8] = {
				background_color: "#666666",
				line_color: line_color,
				warp: "backward"
			};

			// Z, turn backwards = forward warp, grey bg
			pattern_obj.styles[style_start + 9] = {
				background_color: "#666666",
				line_color: line_color,
				warp: "forward"
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
		// Use default special styles
		pattern_obj.special_styles = Meteor.my_params.default_special_styles;

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
			if (typeof position_A_thread === "undefined")
						return; // in case

			if (direction == current_turn_direction[tablet])
			{
				// TODO check for distance == 3, 2 or 1

				// update the visible thread
				if (direction == "F")
					position_A_thread -= distance;

				else
					position_A_thread += distance;

				if (position_A_thread < 0)
					position_A_thread += 4; // % operator is remainder not modulus

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

		// check which Special Style represents 'idle'
		// each tablet is idle unless turned by an action
		var idle_style = "S1"; // just so there is some value
		for (var i=0; i<pattern_obj.special_styles.length; i++)
		{
			if (pattern_obj.special_styles[i].name == "idle")
			{
				idle_style = pattern_obj.special_styles[i].style;
				break;
			}
		}

		for (var i=0; i<picks.length; i++) // each weaving row
		{
			var new_row = []; // build a blank row for row styles
			for (var j=0; j<number_of_tablets; j++)
			{
				new_row.push(idle_style); // placeholder, will be overwritten by pack data
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
	convert_gtt_3_1_twill_pattern_to_json: function(pattern_data, pattern_obj)
	{
		// Pattern data has been read in from a .gtt file and the header information analysed
		// pattern_data is the file data converted to JSON
		// pattern_obj is the unfinished JSON pattern object which needs to be filled in with pattern details

		// build a simulation / manual pattern
		// set up basic pattern data structure
		pattern_obj.tags.push("3/1 broken twill");
		pattern_obj.edit_mode = "simulation";
		pattern_obj.simulation_mode = "manual";
		pattern_obj.orientation = [];
		pattern_obj.threading = [
			[], // hole A
			[], // hole B
			[], // hole C
			[] // hole D
		];
		pattern_obj.weaving = [];
		pattern_obj.styles = default_pattern_data.simulation_styles;
		pattern_obj.special_styles = default_pattern_data.special_styles;

		// analyse the GTT colors
		var result = Meteor.my_functions.analyse_gtt_colors(pattern_data, pattern_obj, 7);
		var number_of_tablets = result.number_of_tablets;
		var unique_colors_list = result.unique_colors_list;
		var tablet_colors = result.tablet_colors;

		////////////////////////////////
		// Import palette colors to styles
		// find the colours in the palette
		// GTT 1.11 does not include Palette data

		var palette = [0,128,32768,32896,8388608,8388736,8421376,8421504,12632256,255,65280,65535,16711680,16711935,16776960,16777215];

		var number_of_colours = Math.min(palette.length, unique_colors_list.length, 7);
		var style_lookup = {}; // find a style from thread Palette color index

		if (typeof pattern_data.Palette !== "undefined")
		{
			palette = [];
			for (var i=0; i<pattern_data.Palette[0].Colour.length; i++)
			{
				palette[i] = pattern_data.Palette[0].Colour[i]["_"];
			}
		}

		for (var i=0; i<number_of_colours; i++)
		{
			var windows_color = parseInt(palette[unique_colors_list[i]]);

			style_lookup[unique_colors_list[i]] = i+1;

			var thread_color = Meteor.my_functions.convert_windows_color_to_hex_rgb(windows_color); // GTT uses Windows color picker

			// add color to threading styles
			pattern_obj.styles[i].background_color = thread_color;

			// add color to weaving styles
			var weaving_style = Meteor.my_functions.weaving_style_from_threading_style(i+1, "S", "F", 1);
			pattern_obj.styles[weaving_style-1].line_color = thread_color;

			weaving_style = Meteor.my_functions.weaving_style_from_threading_style(i+1, "Z", "F", 1);
			pattern_obj.styles[weaving_style-1].line_color = thread_color;

			weaving_style = Meteor.my_functions.weaving_style_from_threading_style(i+1, "Z", "B", 1);
			pattern_obj.styles[weaving_style-1].line_color = thread_color;

			weaving_style = Meteor.my_functions.weaving_style_from_threading_style(i+1, "S", "B", 1);
			pattern_obj.styles[weaving_style-1].line_color = thread_color;
		}

		/////////////////////////////////
		// assign styles to threading
		for (var i=0; i< number_of_tablets; i++)
		{
			var orientation = pattern_obj.orientation[i];

			for (var j=0; j<4; j++)
			{
				var thread_color = tablet_colors[3-j][i]; // read holes D -> A
				pattern_obj.threading[j].push(style_lookup[thread_color]);
			}
		}

		// find twill direction
		// GTT 1.11 does not store twill direction
		var background_twill = "S";
		if (typeof pattern_data.BackgroundTwill !== "undefined")
			background_twill = pattern_data.BackgroundTwill[0];

		var number_of_rows = pattern_data.Length[0] * 2; // two rows per chart square in pattern draft

		var twill_sequence = ["F", "F", "B", "B"]; // turning sequence for an individual tablet to weave background twill

		var current_twill_position = []; // for each tablet, what stage is it at in the twill_sequence? 0, 1, 2, 3
		// tablets start with the previous row, so that if there is a color change in row 1, they will continue as in the non-existent previous row

		for (var i=0; i<number_of_tablets; i++)
		{
			switch (background_twill)
			{
				case "S":
					current_twill_position[i] = (i + 3) % 4;
					break;

				case "Z":
					current_twill_position[i] = 3 - ((i + 0) % 4)
					break;
			}    
		}

		// set up the pattern
		pattern_obj.position_of_A = current_twill_position;
		pattern_obj.manual_weaving_threads = [];
		pattern_obj.manual_weaving_turns = [];

		// analyse color change Data
		// each row of Data corresponds to two picks, offset alternately
		var pattern_chart = [];

		for(var i=0; i<pattern_data.Length[0]; i++)
		{
			var identifier = "P" + (i+1);
			var next_identifier = "P" + (i+2);

			var even_row = [];
			for (var j=0; j<number_of_tablets; j++)
			{
				even_row.push(pattern_data.Data[0][identifier][0].charAt(j));
			}

			pattern_chart.push(even_row);

			var odd_row = [];

			for (var j=0; j<number_of_tablets; j++)
			{
				if (i == (pattern_data.Length[0] - 1)) // last row of Data
				{
					odd_row.push(pattern_data.Data[0][identifier][0].charAt(j));
				}
				else
				{
					if (j%2 == 0)
						odd_row.push(pattern_data.Data[0][identifier][0].charAt(j));
					else
						odd_row.push(pattern_data.Data[0][next_identifier][0].charAt(j));
				}
			}

			pattern_chart.push(odd_row);
		}

		// Analyse long floats data
		var twill_change_chart = [];

		// GTT 1.11 calls long floats "Reversals" and has them in reverse order
		if (typeof pattern_data.LongFloats === "undefined")
		{
			var temp = {};

			for (var i=0; i<pattern_data.Length[0]; i++)
			{
				var identifier = "P" + (i+1);
				var reverser = "P" + (pattern_data.Length[0] - i)
				temp[identifier] = pattern_data.Reversals[0][reverser];
			}
			pattern_data.LongFloats = [];
			pattern_data.LongFloats[0] = temp;
		}

		for(var i=0; i<pattern_data.Length[0]; i++)
		{
			var identifier = "P" + (i+1);
			var next_identifier = "P" + (i+2);

			var even_row = [];
			for (var j=0; j<number_of_tablets; j++)
			{
				even_row.push(pattern_data.LongFloats[0][identifier][0].charAt(j));

				// replace X with Y in second row so we can identify first and second row of long float
				if ((j%2 == 1))
					if (even_row[j] == "X")
						even_row[j] = "Y";
			}

			twill_change_chart.push(even_row);

			var odd_row = [];

			for (var j=0; j<number_of_tablets; j++)
			{
				if (i == (pattern_data.Length[0] - 1)) // last row of LongFloats
				{
					odd_row.push(pattern_data.LongFloats[0][identifier][0].charAt(j));
				}
				else
				{
					if (j%2 == 0)
						odd_row.push(pattern_data.LongFloats[0][identifier][0].charAt(j));
					else
						odd_row.push(pattern_data.LongFloats[0][next_identifier][0].charAt(j));
				}

				// replace X with Y in second row so we can identify first and second row of long float
				if ((j%2 == 0))
				if (odd_row[j] == "X")
					odd_row[j] = "Y";
				
			}

			twill_change_chart.push(odd_row);
		}

		// set up packs
		var new_turn = {
			tablets: [], // for each tablet, the pack number
			packs: [] // turning info for each pack
		}

		for (var i=1; i<=Meteor.my_params.number_of_packs; i++)
		{
			var pack = {
				pack_number: i,
				direction: (i == 2) ? "B" : "F", // second pack goes backwards
				number_of_turns: 1
			}
			new_turn.packs.push(pack);
		}

		// weave the pattern row by row
		for (var i=0; i<number_of_rows; i++)
		{
			// put the tablets in the correct packs
			new_turn.tablets = [];
			
			for (var j=0; j<number_of_tablets; j++)
			{
				// read the pattern chart
				var current_color = pattern_chart[i][j];
				var next_color = current_color;
				var last_color = ".";
				var color_change = false;

				// check for color change
				// color change affects two rows
				if (i<(number_of_rows - 1)) // last row has no next row
					next_color = pattern_chart[i+1][j];

				if (i > 0)
					last_color = pattern_chart[i-1][j];

				if (i<number_of_rows)
				{
					if (next_color != current_color)
						color_change = true;

					if (last_color != current_color)
					{
						color_change = true;
						if (i == 0) // tablet starts with foreground color
							current_twill_position[j] =  (current_twill_position[j] + 3) % 4; // go back an extra turn
					}
				}        

				var long_float = twill_change_chart[i][j];

				var previous_long_float = ".";
				if (i != 0)
					previous_long_float = twill_change_chart[i-1][j];

				var next_long_float = ".";

				if ((i < number_of_rows - 1))
					next_long_float = twill_change_chart[i+1][j];     

				// handle long floats

				// advance in turning sequence
				if ((!color_change))
					 current_twill_position[j] =  (current_twill_position[j] + 1) % 4;        

				if ((long_float == "Y")) // second pick of long float
					current_twill_position[j] =  (current_twill_position[j] + 2) % 4;

				var position = current_twill_position[j];
				var direction = twill_sequence[position];

				var pack = (direction == "F") ? 1 : 2;
				new_turn.tablets.push(pack);
			}
			pattern_obj.manual_weaving_turns[0] = new_turn;
			pattern_obj = Meteor.my_functions.weave_row(pattern_obj, JSON.parse(JSON.stringify(new_turn)));
		}

		return {result: pattern_obj};  
	},
	analyse_gtt_colors: function(pattern_data, pattern_obj, max_colors)
	{
		 // list all thread colors used in tablets, and map each color to a tablet
		var tablets_data = pattern_data.Cards[0].Card;
		var number_of_tablets = tablets_data.length;

		// colours records the thread colour for the hole. This will need to be translated into styles showing direction and orientation.
		var tablet_colors = [
			[], // hole A
			[], // hole B
			[], // hole C
			[] // hole D
		];
		var unique_colours_counter = {}; // for counting occurrences of colours
		var unique_colors_list = [];

		for (var i=0; i< number_of_tablets; i++)
		{
			// note orientation of tablets
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

		// simulation patterns can only handle 7 colors because there are only 8 possible thread styles, one of which is empty
		// so replace any colours past the first 7 with the 7th colour
		if (unique_colors_list.length > max_colors)
		{
			for (var i=0; i< number_of_tablets; i++)
			{
				for (var j=0; j<4; j++)
				{
					if (unique_colors_list.indexOf(tablet_colors[j][i]) > max_colors)
						tablet_colors[j][i] = unique_colors_list[max_colors];
				}
			}
		}

		return {
			number_of_tablets: number_of_tablets,
			unique_colors_list: unique_colors_list,
			tablet_colors: tablet_colors // GTT threading data
		};
	},
	store_pattern: function(pattern_id)
	{
		var pattern = Patterns.findOne({_id: pattern_id});

		if (typeof pattern === "undefined")
				return;

		var data = {};
		data._id = pattern_id;
		data.number_of_rows = pattern.number_of_rows;
		data.number_of_tablets = pattern.number_of_tablets;

		data.weaving = Meteor.my_functions.get_weaving_as_array(data.number_of_rows, data.number_of_tablets);
		data.threading = Meteor.my_functions.get_threading_as_array(data.number_of_tablets);
		data.orientation = Meteor.my_functions.get_orientation_as_array(pattern_id);
		data.styles = Meteor.my_functions.get_styles_as_array(pattern_id);
		data.auto_preview = pattern.auto_preview;

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
		Meteor.my_functions.save_preview_as_text(pattern_id);
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
			Meteor.my_functions.initialize_warp_color_picker();
			Meteor.my_functions.initialize_weft_color_picker();
			Meteor.my_functions.save_preview_as_text(pattern_id);
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
	thumbnails_in_row: function()
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

			window.localStorage.setItem('recent_patterns', JSON.stringify(recent_patterns));

			if (recent_patterns.length > Meteor.my_params.max_recents) // don't store too many patterns
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

			if (recent_patterns == null)
				return;

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
	get_recent_pattern_ids: function(){
		var pattern_ids = [];

		if (Meteor.userId()) // user is signed in
		{

			var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

			for (var i=0; i < recent_patterns.length; i++)
			{  
				pattern_ids.push(recent_patterns[i].pattern_id);
			}
		}
		else
		{
			pattern_ids = JSON.parse(window.localStorage.getItem('recent_patterns'));
		}

		if (pattern_ids == null)
				return [];

		// check the pattern ids exist
		var checked_pattern_ids = [];
		for (var i=0; i<pattern_ids.length; i++)
		{
			var id = pattern_ids[i];

			if (id == null) continue;
			if (typeof id === "undefined") continue;

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

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

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
	clear_pattern_display_data: function()
	{
		// prevent leftover data from previous pattern causing problems
		// reset orientation ReactiveVars
		if (typeof current_orientation !== "undefined")
		{
			for (var variableKey in current_orientation){
				if (current_orientation.hasOwnProperty(variableKey)){
					delete current_orientation[variableKey];
				}
			}
		}
	},
	build_pattern_display_data: function(pattern_id)
	{
		//console.log('build_pattern_display_data start');
		// maintain a local array of arrays with the data for the current pattern in optimum form. Getting each row out of the database when drawing it is very slow.

		// elements in reactive arrays need to be updated with arr.splice(pos, 1 new_value) to be reactive

		var pattern = Patterns.findOne({_id: pattern_id});

		if (!pattern.weaving)
			return;

		var number_of_tablets = pattern.number_of_tablets;
		var number_of_rows = pattern.number_of_rows;
		Session.set("number_of_rows", number_of_rows);
		Session.set("number_of_tablets", number_of_tablets);

		// Client-side weaving data is an object which references a ReactiveVar for each cell data point
		var weaving_data = JSON.parse(pattern.weaving);
		var temp = {};

		for (var i=0; i<number_of_rows; i++)
		{
			for (var j=0; j<number_of_tablets; j++)
			{
				temp[(i + 1) + "_" + (j + 1)] = new ReactiveVar(weaving_data[i][j]);
			}
		}

		current_weaving = temp;

		// client-side weft color is a ReactiveVar
		var color = (typeof pattern.weft_color !== "undefined") ? pattern.weft_color : "#76a5af"; // older version pattern does not have weft_color
		weft_color = new ReactiveVar(color);

		// Client-side threading data is an object which references a ReactiveVar for each cell data point
		var temp = {};

		var threading_data = JSON.parse(pattern.threading);
		for (var i=0; i<4; i++)
		{
			for (var j=0; j<number_of_tablets; j++)
			{
				temp[(i + 1) + "_" + (j + 1)] = new ReactiveVar(threading_data[i][j]);
			}
		}

		current_threading = temp;

		//////////////////////////////
		// build the orientation data

		// deleting and recreating the reactiveVars here breaks reactivity in Simulation patterns, so only create vars if they did not already exist.
		if (typeof current_orientation === "undefined")
			current_orientation = {};

		var orientation_data = JSON.parse(pattern.orientation);

		for (var i=0; i<number_of_tablets; i++)
		{
			if (typeof current_orientation[i + 1] === "undefined")
				current_orientation[i + 1] = new ReactiveVar();

			current_orientation[i + 1].set(orientation_data[i]);
		}

		// prune any leftover tablet entries
		for (var i=number_of_tablets; i<Object.keys(current_orientation).length; i++)
		{
			delete current_orientation[i];
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

			if (typeof styles_array[i].warp === "undefined")
				styles_array[i].warp = "none";
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
				special_styles_array[i] = Meteor.my_params.default_special_styles[i];

			else 
				special_styles_array[i] = special_styles_data[i];

			special_styles_array[i].style = "S" + (i+1);
		}

		// if rebuilding, clearing the array forces helpers to rerun
		if (typeof current_special_styles !== "undefined")
			current_special_styles.clear();

		current_special_styles = new ReactiveArray(special_styles_array);

		//////////////////////////////
		// build the simulation data for a 3/1 broken twill pattern
		if (pattern.edit_mode == "broken_twill")
		{
			var pattern_obj = {};

			// build the weaving chart from the charts
			var raw_pattern_chart = JSON.parse(pattern.twill_pattern_chart);
			var raw_twill_change_chart = JSON.parse(pattern.twill_change_chart);

			var twill_pattern_chart = []; // array for internal working in this function

			// each row of raw pattern data corresponds to two picks, offset alternately
			// build the pattern chart
			for (var i=0; i<raw_pattern_chart.length; i++)
			{
				var even_row = [];
				for (var j=0; j<number_of_tablets; j++)
				{
					even_row.push(raw_pattern_chart[i][j]);
				}

				twill_pattern_chart.push(even_row);

				var odd_row = [];

				for (var j=0; j<number_of_tablets; j++)
				{
					if (i == (raw_pattern_chart.length - 1)) // last row of Data
					{
						odd_row.push(raw_pattern_chart[i][j]);
					}
					else
					{
						if (j%2 == 0)
							odd_row.push(raw_pattern_chart[i][j]);
						else
							odd_row.push(raw_pattern_chart[i+1][j]);
					}
				}

				twill_pattern_chart.push(odd_row);
			}

			// deleting and recreating the reactiveVars here breaks reactivity, so only create vars if they did not already exist.
			if (typeof current_twill_pattern_chart === "undefined")
				current_twill_pattern_chart = {};

			for (var i=0; i<raw_pattern_chart.length; i++)
			{
				for (var j=0; j<number_of_tablets; j++)
				{
					if (typeof current_twill_pattern_chart[(i + 1) + "_" + (j + 1)] === "undefined")
						current_twill_pattern_chart[(i + 1) + "_" + (j + 1)] = new ReactiveVar();

					current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].set(raw_pattern_chart[i][j]);
				}
			}

			// prune any leftover table cells
			for(var key in current_twill_pattern_chart){
				const indexes = key.split("_");
				// indexes corresponds to i + 1, j + 1 as strings

				if (typeof raw_pattern_chart[parseInt(indexes[0]-1)] === "undefined") {
					delete current_twill_pattern_chart[key];
				} else if (typeof raw_pattern_chart[parseInt(indexes[0]-1)][parseInt(indexes[1]-1)] === "undefined") {
					delete current_twill_pattern_chart[key];
				}
			}

			// build the long floats chart
			var twill_change_chart = []; // array for internal working in this function

			for(var i=0; i<raw_pattern_chart.length; i++)
			{
				var even_row = [];
				for (var j=0; j<number_of_tablets; j++)
				{
					even_row.push(raw_twill_change_chart[i][j]);

					// replace X with Y in second row so we can identify first and second row of long float
					if ((j%2 == 1))
						if (even_row[j] == "X")
							even_row[j] = "Y";
				}

				twill_change_chart.push(even_row);

				var odd_row = [];

				for (var j=0; j<number_of_tablets; j++)
				{
					if (i == (raw_pattern_chart.length - 1)) // last row of LongFloats
					{
						odd_row.push(raw_twill_change_chart[i][j]);
					}
					else
					{
						if (j%2 == 0)
							odd_row.push(raw_twill_change_chart[i][j]);
						else
							odd_row.push(raw_twill_change_chart[i+1][j]);
					}

					// replace X with Y in second row so we can identify first and second row of long float
					if ((j%2 == 0))
					if (odd_row[j] == "X")
						odd_row[j] = "Y";
					
				}

				twill_change_chart.push(odd_row);
			}

			// deleting and recreating the reactiveVars here breaks reactivity, so only create vars if they did not already exist.
			if (typeof current_twill_change_chart === "undefined")
				current_twill_change_chart = {};

			for (var i=0; i<raw_pattern_chart.length; i++)
			{
				for (var j=0; j<number_of_tablets; j++)
				{
					if (typeof current_twill_change_chart[(i + 1) + "_" + (j + 1)] === "undefined")
						current_twill_change_chart[(i + 1) + "_" + (j + 1)] = new ReactiveVar();

					current_twill_change_chart[(i + 1) + "_" + (j + 1)].set(raw_twill_change_chart[i][j]);
				}
			}

			// prune any leftover table cells
			for(var key in current_twill_change_chart){
				const indexes = key.split("_");
				// indexes corresponds to i + 1, j + 1 as strings

				if (typeof raw_twill_change_chart[parseInt(indexes[0]-1)] === "undefined") {
					delete current_twill_change_chart[key];
				} else if (typeof raw_twill_change_chart[parseInt(indexes[0]-1)][parseInt(indexes[1]-1)] === "undefined") {
					delete current_twill_change_chart[key];
				}
			}

			// create the pattern. This is from my_functions.convert_gtt_3_1_twill_pattern_to_json
			var twill_direction = pattern.twill_direction;
			
			var number_of_rows = twill_pattern_chart.length - 2; // last rows are only there to determine last even row of weaving
			var number_of_tablets = pattern.number_of_tablets;

			var twill_sequence = ["F", "F", "B", "B"]; // turning sequence for an individual tablet to weave background twill

			var current_twill_position = []; // for each tablet, what stage is it at in the twill_sequence? 0, 1, 2, 3
			// tablets start with the previous row, so that if there is a color change in row 1, they will continue as in the non-existent previous row

			for (var i=0; i<number_of_tablets; i++)
			{
				switch (twill_direction)
				{
					case "S":
						current_twill_position.push((i + 3) % 4);
						break;

					case "Z":
						current_twill_position.push(3 - ((i + 0) % 4));
						break;
				}    
			}

			// set up the pattern
			pattern_obj.position_of_A = current_twill_position;
			pattern_obj.manual_weaving_threads = [];
			pattern_obj.manual_weaving_turns = [];
			pattern_obj.weaving = [];

			// set up packs
			var new_turn = {
				tablets: [], // for each tablet, the pack number
				packs: [] // turning info for each pack
			}

			for (var i=1; i<=Meteor.my_params.number_of_packs; i++)
			{
				var pack = {
					pack_number: i,
					direction: (i == 2) ? "B" : "F", // second pack goes backwards
					number_of_turns: 1
				}
				new_turn.packs.push(pack);
			}

			// weave the pattern row by row
			for (var i=0; i<number_of_rows; i++)
			{
				// put the tablets in the correct packs
				new_turn.tablets = [];

				for (var j=0; j<number_of_tablets; j++)
				{
					// read the pattern chart
					var current_color = twill_pattern_chart[i][j];
					var next_color = current_color;
					var last_color = ".";
					var color_change = false;

					// check for color change
					// color change affects two rows
					if (i<(number_of_rows - 1)) // last row has no next row
					{
						next_color = twill_pattern_chart[i+1][j]; // problem
					}

					if (i > 0)
						last_color = twill_pattern_chart[i-1][j];

					if (next_color != current_color)
						color_change = true;

					if (last_color != current_color)
					{
						color_change = true;
						if (i == 0) // tablet starts with foreground color
							current_twill_position[j] =  (current_twill_position[j] + 3) % 4; // go back an extra turn
					} 

					var long_float = twill_change_chart[i][j];

					var previous_long_float = ".";
					if (i != 0)
						previous_long_float = twill_change_chart[i-1][j];

					var next_long_float = ".";

					if ((i < number_of_rows - 1))
						next_long_float = twill_change_chart[i+1][j];     

					// handle long floats
					// advance in turning sequence
					if ((!color_change))
						 current_twill_position[j] =  (current_twill_position[j] + 1) % 4;        

					if ((long_float == "Y")) // second pick of long float
						current_twill_position[j] =  (current_twill_position[j] + 2) % 4;

					var position = current_twill_position[j];
					var direction = twill_sequence[position];

					var pack = (direction == "F") ? 1 : 2;
					new_turn.tablets.push(pack);
				}
				pattern_obj.manual_weaving_turns[0] = new_turn;
				pattern_obj = Meteor.my_functions.weave_row(pattern_obj, JSON.parse(JSON.stringify(new_turn)));
			}

			var manual_weaving_turns = pattern_obj.manual_weaving_turns;

			if (Session.get("number_of_rows") == 0)
			{
				// reset direction, number of turns to "F", 1
				for (var i=0; i<manual_weaving_turns[0].packs.length; i++)
				{
					manual_weaving_turns[0].packs[i].direction = "F";
					manual_weaving_turns[0].packs[i].number_of_turns = 1;
				}
			}
			else
			{
				// show direction, number of turns for latest row
				// ensure it's a new object not a reference
				manual_weaving_turns[0] = JSON.parse(JSON.stringify(manual_weaving_turns[manual_weaving_turns.length-1]));
			}

			current_manual_weaving_turns = new ReactiveArray(manual_weaving_turns);
		}

		//////////////////////////////
		// build the simulation pattern auto_turn_sequence data
		// if rebuilding, clearing the array forces helpers to rerun
		if (pattern.edit_mode == "simulation")
		{
			// auto
			if (typeof current_auto_turn_sequence !== "undefined")
				current_auto_turn_sequence.clear();

			var auto_turn_sequence = pattern.auto_turn_sequence;

			var blank_arr = new Array(auto_turn_sequence.length)
			current_auto_turn_sequence = new ReactiveArray(blank_arr);

			for (var i=0; i<auto_turn_sequence.length; i++)
			{
				var obj = {
					turn: i+1,
					direction: auto_turn_sequence[i]
				}

				current_auto_turn_sequence[i] = obj;
			}

			// manual
			var manual_weaving_turns = JSON.parse(pattern.manual_weaving_turns);

				var working_row = manual_weaving_turns.length-1;
				if (Session.get('sim_weave_mode') == "add_row") {
				// set the working row to the latest row
				// ensure it's a new object not a reference

				} else if (Session.get('sim_weave_mode') == "edit_row") {
					// set the working row to the edit row
					working_row = Session.get('row_to_edit')
				}
				manual_weaving_turns[0] = JSON.parse(JSON.stringify(manual_weaving_turns[working_row]));

			current_manual_weaving_turns = new ReactiveArray(manual_weaving_turns);
		}
	},
	update_after_tablet_change: function()
	{
		var data = stored_patterns[stored_patterns.length-2];

		number_of_tablets = data.number_of_tablets;
		number_of_rows = data.number_of_rows;

		// restore
		var data = stored_patterns[stored_patterns.length-1];

		var pattern_id = Router.current().params._id;
		var pattern = Patterns.findOne({_id: pattern_id}); // TODO remove, just for logging

		Meteor.call('update_after_tablet_change', data, function(){
			var pattern_id = Router.current().params._id;
			Meteor.my_functions.build_pattern_display_data(pattern_id);
		});
	},
	add_weaving_row: function(pattern_id, position, style, num_new_rows)
	{
		if (Session.get('change_tablets_latch'))
				return;

		Session.set('change_tablets_latch', true);

		var number_of_tablets = Session.get("number_of_tablets");
		var number_of_rows = Session.get("number_of_rows");

		if (typeof num_new_rows === "undefined") // default to 1 row
			var num_new_rows = 1;

		if (number_of_rows == 0)
			position = 1;

		if (position == -1) // -1 is a shorthand meaning add row at end
			position = number_of_rows+1;

		if (position < 0) // -1 is a shorthand meaning add row at end
			position = 1;

		// must be an integer between 1 and number of tablets + 1 (new row at end)
		position = Math.floor(position);
		position = Math.max(position, 1);
		position = Math.min(position, number_of_rows+1);

		// only add a valid number of rows, integer between 1 & 20
		num_new_rows = Math.floor(num_new_rows);
		num_new_rows = Math.max(num_new_rows, 1);
		num_new_rows = Math.min(num_new_rows, 20);

		for (var k=0; k<num_new_rows; k++)
		{
			// increment row number of cells in subsequent rows
			for (var i=number_of_rows+k-1; i>= position-1; i--)
			{
				for (var j=0; j<number_of_tablets; j++)
				{
					// delete the existing ReactiveVar
					// recreate a new one with the same style but greater row
					var cell_style = current_weaving[(i + 1) + "_" + (j + 1)].get();
					delete current_weaving[(i + 1) + "_" + (j + 1)];
					current_weaving[(i + 2) + "_" + (j + 1)] = new ReactiveVar(cell_style);
				}
			}
			// add new row
			for (var j=0; j<number_of_tablets; j++)
			{
				current_weaving[position + "_" + (j + 1)] = new ReactiveVar(style);
			}
		}

		Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows + num_new_rows, number_of_tablets);
	},
	remove_weaving_row: function(pattern_id, position){
		if (Session.get('change_tablets_latch'))
				return;

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		Session.set('change_tablets_latch', true);
 
		var number_of_tablets = Session.get("number_of_tablets");
		var number_of_rows = Session.get("number_of_rows");

		if ((number_of_rows <= 1) || (position < 1) || (position > (number_of_rows)))
			return;

		// remove deleted row
		for (var j=0; j<number_of_tablets; j++)
		{
			delete current_weaving[(position) + "_" + (j + 1)];
		}

		// decrement row number of cells in subsequent rows
		for (var i=position; i<=number_of_rows-1; i++)
		{
			for (var j=0; j<number_of_tablets; j++)
			{
				var cell_style = current_weaving[(i + 1) + "_" + (j + 1)].get();
				delete current_weaving[(i + 1) + "_" + (j + 1)];
				current_weaving[(i) + "_" + (j + 1)] = new ReactiveVar(cell_style);
			}
		}

		Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows - 1, number_of_tablets);
		return;
	},
	add_tablet: function(pattern_id, position, style)
	{
		if (Session.get('change_tablets_latch'))
				return;

		Session.set('change_tablets_latch', true);

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		var number_of_tablets = Session.get("number_of_tablets");
		var number_of_rows = Session.get("number_of_rows");

		if (position == -1) // -1 is a shorthand meaning add tablet at end
			var position = number_of_tablets+1;

		// weaving
		for (var i=0; i<number_of_rows; i++)
		{
			for (var j=number_of_tablets-1; j>= position-1; j--)
			{
				// delete the existing ReactiveVar
				// recreate a new one with the same style but greater tablet
				var cell_style = current_weaving[(i + 1) + "_" + (j + 1)].get();
				delete current_weaving[(i + 1) + "_" + (j + 1)];
				current_weaving[(i + 1) + "_" + (j + 2)] = new ReactiveVar(cell_style);
			}

			// add new tablet to row
			current_weaving[(i + 1) + "_" + position] = new ReactiveVar(style);
		}

		// threading
		// broken twill threading is generated automatically
		if (pattern.edit_mode == "broken_twill") {
			// create reactive vars for new tablet
			for (var i=0; i<4; i++)
			{
				current_threading[(i + 1) + "_" + (number_of_tablets + 1)] = new ReactiveVar();
			}

			const broken_twill_threading = Meteor.my_functions.broken_twill_threading();

			for (var j=number_of_tablets; j>= position - 1; j--) {
				// find foreground, background colours of this tablet
				// map to positions on next tablet
				// new tablet will use colours from previous tablet

				// find a background cell from broken_twill_threading table

				// tablets 1, 2, 4 have background color in hole 1 (index 0)

				var tablet_index = 0; // new tablet at position 1 will copy colours from current tablet 1
				var source_tablet = 1;
				
				// new tablet later than 1
				if (j != 0) {
					tablet_index = (j - 1) % 4;
					source_tablet = j;
				}

				var background_index = 0;
				if (tablet_index == 2) { // tablet 3 has background colour in hole 4 (index 3)
					background_index = 3;
				}

				background_style = current_threading[(background_index + 1) + "_" + (source_tablet)].get();

				// tablets 2, 3, 4 have foreground colour in hole 2 (index 1)
				let foreground_index = 1;
				if (tablet_index == 0) { // tablet 1 has foreground colour in hole 4 (index 3)
					foreground_index = 3;
				}

				foreground_style = current_threading[(foreground_index + 1) + "_" + (source_tablet)].get();

				for (var i=0; i<4; i++)
				{
					if (broken_twill_threading[i][j % 4] == "B") {
						current_threading[(i + 1) + "_" + (j + 1)].set(background_style);
					} else {
						current_threading[(i + 1) + "_" + (j + 1)].set(foreground_style);
					}
				}
			}
		} else {
			for (var i=0; i<4; i++)
			{
				for (var j=number_of_tablets-1; j>= position-1; j--)
				{
					var cell_style = current_threading[(i + 1) + "_" + (j + 1)].get();
					delete current_threading[(i + 1) + "_" + (j + 1)];
					current_threading[(i + 1) + "_" + (j + 2)] = new ReactiveVar(cell_style);
				}

				current_threading[(i + 1) + "_" + position] = new ReactiveVar(style);
			}
		}

		// orientation
		// add a new tablet at the end
		current_orientation[number_of_tablets + 1] = new ReactiveVar();

		// move the values above the inserted tablet up by one
		for (var j=number_of_tablets; j>=position; j--)
		{
			current_orientation[j+1].set(current_orientation[j].get());
		}
		 
		// set the value of the new tablet to default "S"
		current_orientation[position].set("S");

		// manual_weaving_turns
		if (pattern.edit_mode == "simulation")
		{
			for (var i=0;i<current_manual_weaving_turns.list().length; i++)
			{
				current_manual_weaving_turns.list()[i].tablets.splice(position-1, 0, 1);
			}
		} else if (pattern.edit_mode == "broken_twill") {
			// broken twill charts
			for (var i=0; i<number_of_rows/2 + 1; i++) // 2 weaving rows per twill chart row. Plus an extra twill chart row at end for determining the final row direction
			{
				// add new tablet at end
				current_twill_pattern_chart[(i + 1) + "_" + (number_of_tablets + 1)] = new ReactiveVar();

				current_twill_change_chart[(i + 1) + "_" + (number_of_tablets + 1)] = new ReactiveVar();

				for (var j=number_of_tablets-1; j>= position-1; j--)
				{
					// do not delete the existing ReactiveVar because that breaks reactivity
					// copy its value to the var with a greater tablet

					// twill pattern chart
					var cell_value;

					if ((i == 0) &&  (j % 2 ==0)) { // new tablet j+2 is even. first row must be background colour.
						cell_value = ".";
					} else {
						cell_value = current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].get();
					}

					current_twill_pattern_chart[(i + 1) + "_" + (j + 2)].set(cell_value);

					// twill change chart
					if ((i == 0) &&  (j % 2 ==0)) { // new tablet j+2 is even. first row must be no twill change.
						cell_value = ".";
					} else {
						cell_value = current_twill_change_chart[(i + 1) + "_" + (j + 1)].get();
					}

					current_twill_change_chart[(i + 1) + "_" + (j + 2)].set(cell_value);
				}

				//set value of new tablet
				current_twill_pattern_chart[(i + 1) + "_" + position].set('.');

				current_twill_change_chart[(i + 1) + "_" + position].set('.');
			}

			// recalculate threading chart
			/*const broken_twill_threading = [
				[2,2,1,2],
				[2,1,1,1],
				[1,1,2,1],
				[1,2,2,2]
			]; */
/*
			const broken_twill_threading = Meteor.my_functions.broken_twill_threading();

			for (var i=0; i<4; i++)
			{
				// there is now one more tablet than before
				for (var j=0; j<number_of_tablets+1; j++)
				{
					current_threading[(i + 1) + "_" + (j + 1)] = new ReactiveVar(broken_twill_threading[i][j%4]);
				}
			} */

			Meteor.my_functions.update_twill_charts(pattern_id, number_of_rows, number_of_tablets+1);
			return;
		}

		// save to database
		Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows, number_of_tablets + 1);
	},
	remove_tablet: function(pattern_id, position)
	{
		if (Session.get('change_tablets_latch'))
				return;

		Session.set('change_tablets_latch', true);

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		var number_of_tablets = Session.get("number_of_tablets");
		var number_of_rows = Session.get("number_of_rows");

		if ((number_of_tablets <= 1) || (position < 1) || (position > (number_of_tablets)))
			return;

		// weaving
		for (var i=0; i<number_of_rows; i++)
		{
			// remove deleted tablet
			delete current_weaving[(i + 1) + "_" + position];

			for (var j=position; j<=number_of_tablets-1; j++)
			{
				var cell_style = current_weaving[(i + 1) + "_" + (j + 1)].get();
				delete current_weaving[(i + 1) + "_" + (j + 1)];
				current_weaving[(i + 1) + "_" + (j)] = new ReactiveVar(cell_style);
			}
		}

		// threading
		// broken twill threading is generated automatically
		if (pattern.edit_mode == "broken_twill") {
			const broken_twill_threading = Meteor.my_functions.broken_twill_threading();

			for (var j=position; j<=number_of_tablets-1; j++)
			{
				// find foreground, background colours of next tablet
				// map to positions on this tablet
				var tablet_index = (j) % 4;
				var source_tablet = j + 1;

				var background_index = 0;
				if (tablet_index == 2) { // tablet 3 has background colour in hole 4 (index 3)
					background_index = 3;
				}

				background_style = current_threading[(background_index + 1) + "_" + (source_tablet)].get();

				// tablets 2, 3, 4 have foreground colour in hole 2 (index 1)
				let foreground_index = 1;
				if (tablet_index == 0) { // tablet 1 has foreground colour in hole 4 (index 3)
					foreground_index = 3;
				}

				foreground_style = current_threading[(foreground_index + 1) + "_" + (source_tablet)].get();

				for (var i=0; i<4; i++)
				{
					if (broken_twill_threading[i][(j - 1) % 4] == "B") {
						current_threading[(i + 1) + "_" + (j)].set(background_style);
					} else {
						current_threading[(i + 1) + "_" + (j)].set(foreground_style);
					}
				}
			}

			// delete last tablet
			for (var i=0; i<4; i++)
			{
				delete current_threading[(i + 1) + "_" + number_of_tablets];
			}
		} else {
			for (var i=0; i<4; i++)
			{
				delete current_threading[(i + 1) + "_" + position];

				for (var j=position; j<=number_of_tablets-1; j++)
				{
					var cell_style = current_threading[(i + 1) + "_" + (j + 1)].get();
					delete current_threading[(i + 1) + "_" + (j + 1)];
					current_threading[(i + 1) + "_" + (j)] = new ReactiveVar(cell_style);
				}
			}
		}

		// orientation
		// move the values above the deleted tablet down by one
		for (var j=position; j<number_of_tablets; j++)
		{
			current_orientation[j].set(current_orientation[j+1].get());
		}

		// remove the last tablet
		delete current_orientation[number_of_tablets];

		if (pattern.edit_mode == "simulation")
		{
			for (var i=0;i<current_manual_weaving_turns.list().length; i++)
			{
				current_manual_weaving_turns.list()[i].tablets.splice(position-1, 1);
			}
		} else if (pattern.edit_mode == "broken_twill") {
			// broken twill charts
			for (var i=0; i<number_of_rows/2; i++)
			{
				for (var j=position; j<=number_of_tablets-1; j++)
				{
					// move subsequent tablets down
					var cell_value;

					// pattern chart
					if ((i == 0) &&  (j % 2 ==0)) { // new tablet j is even. first row must be background colour.
						cell_value = ".";
					} else {
						cell_value = current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].get();
					}

					current_twill_pattern_chart[(i + 1) + "_" + (j)].set(cell_value);

					// twill change chart
					if ((i == 0) &&  (j % 2 ==0)) { // new tablet j is even. first row must be no twill change.
						cell_value = ".";
					} else {
						cell_value = current_twill_change_chart[(i + 1) + "_" + (j + 1)].get();
					}

					current_twill_change_chart[(i + 1) + "_" + (j)].set(cell_value);
				}
				// remove last tablet
				delete current_twill_pattern_chart[(i + 1) + "_" + number_of_tablets];
				delete current_twill_change_chart[(i + 1) + "_" + number_of_tablets];
			}

			Meteor.my_functions.update_twill_charts(pattern_id, number_of_rows, number_of_tablets - 1);
			return;
		}

		Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows, number_of_tablets - 1);
	},
	///////////////////////////////////////
	// Broken twill: add and remove rows
	add_twill_row: function(pattern_id, position, num_new_rows)
	{
		if (Session.get('change_tablets_latch'))
				return;

		Session.set('change_tablets_latch', true);

		var number_of_tablets = Session.get("number_of_tablets");

		// two rows of twill chart per weaving row
		// plus an extra row to determine last weaving row
		var number_of_rows = (Session.get("number_of_rows") / 2) + 1;

		// must be an integer between 1 and number of tablets + 1 (new row at end)
		position = Math.floor(position);
		position = Math.max(position, 1);
		position = Math.min(position, number_of_rows+1);

		// only add a valid number of rows, integer between 1 & 10
		num_new_rows = Math.floor(num_new_rows);
		num_new_rows = Math.max(num_new_rows, 1);
		num_new_rows = Math.min(num_new_rows, 10);

		for (var k=0; k<num_new_rows; k++)
		{
			// increment row number of cells in subsequent rows
			for (var i=number_of_rows+k-1; i>= position-1; i--)
			{
				for (var j=0; j<number_of_tablets; j++)
				{
					// do not delete the existing ReactiveVar because that breaks reactivity
					// copy its value to the var with a greater row

					// twill pattern chart
					var cell_value = current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].get();

					if (i==number_of_rows+k-1) { // add new row at end
						current_twill_pattern_chart[(i + 2) + "_" + (j + 1)] = new ReactiveVar(cell_value);
					} else {
						current_twill_pattern_chart[(i + 2) + "_" + (j + 1)].set(cell_value);
					}

					if (i == position - 1) {
						current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].set("."); // inserted row
					}

					// twill change chart
					var cell_value = current_twill_change_chart[(i + 1) + "_" + (j + 1)].get();
	
					if (i==number_of_rows+k-1) { // add new row at end
						current_twill_change_chart[(i + 2) + "_" + (j + 1)] = new ReactiveVar(cell_value);
						} else {
						current_twill_change_chart[(i + 2) + "_" + (j + 1)].set(cell_value);
					}

					if (i == position - 1) {
						current_twill_change_chart[(i + 1) + "_" + (j + 1)].set("."); // inserted row
					}
				}
			}
		}

		// -1 for extra row in twill chart compared to weaving chart
		Meteor.my_functions.update_twill_charts(pattern_id, (number_of_rows + num_new_rows - 1)*2, number_of_tablets);
	},
	remove_twill_row: function(pattern_id, position) {
		Session.set('change_tablets_latch', true);
 
		var number_of_tablets = Session.get("number_of_tablets");
		
		// two rows of twill chart per weaving row
		// plus an extra row to determine last weaving row
		var number_of_rows = (Session.get("number_of_rows") / 2) + 1;

		if ((number_of_rows <= 2) || (position < 1) || (position > (number_of_rows)))
			return;

		// decrement row number of cells in subsequent rows
		for (var i=position; i<=number_of_rows-1; i++)
		{
			for (var j=0; j<number_of_tablets; j++)
			{
				var cell_value;

				// twill pattern chart
				if ((i) == 1 && (j + 1) %2 == 0) {
					cell_value = "."; // first row of even tablets must be background colour
				} else {
					var cell_value = current_twill_pattern_chart[(i + 1) + "_" + (j + 1)].get();
				}

				current_twill_pattern_chart[(i) + "_" + (j + 1)].set(cell_value);

				// twill change chart
				if ((i) == 1 && (j + 1) %2 == 0) {
					cell_value = "."; // first row of even tablets must not have twill change
				} else {
					var cell_value = current_twill_change_chart[(i + 1) + "_" + (j + 1)].get();
				}

				current_twill_change_chart[(i) + "_" + (j + 1)].set(cell_value);
			}
		}

		// remove last row
		for (var j=0; j<number_of_tablets; j++)
		{
			delete current_twill_pattern_chart[(number_of_rows) + "_" + (j + 1)];
			delete current_twill_change_chart[(number_of_rows) + "_" + (j + 1)];
		}

		// -1 for removed row, -1 for extra row in twill chart compared to weaving chart
		Meteor.my_functions.update_twill_charts(pattern_id, (number_of_rows - 2)*2, number_of_tablets);
	},
	///////////////////////////////////////
	get_weaving_as_array: function(number_of_rows, number_of_tablets)
	{
		// turn the reactive array of objects into simple nested arrays of style values
		var weaving_array = new Array(number_of_rows);

		for (var i=0; i<number_of_rows; i++)
		{
			weaving_array[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				var item = current_weaving[(i+1) + "_" + (j+1)];
				if (typeof item !== "undefined")
				{
					weaving_array[i][j] = item.get();
				}

				else
				{
					console.log("non-existent item in get_weaving_as_array");
					console.log("identifier " + (i+1) + "_" + (j+1));
				}

				// TODO find why this code sometimes gives an error and fix it
				/*var identifier = (i+1) + "_" + (j+1);

				if (typeof current_weaving[identifier] === "undefined")
				{
					console.log("get_weaving_as_array error");
					console.log("identifier " + identifier);
				}
				else
				{
				var value = current_weaving[identifier].get();
				
				weaving_array[i][j] = current_weaving[(i+1) + "_" + (j+1)].get();*/
			}
		}

		return weaving_array;
	},
	save_weaving_to_db: function(pattern_id, number_of_rows, number_of_tablets)
	{
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {number_of_tablets: 1, number_of_rows: 1, edit_mode: 1}});
		if (typeof pattern === "undefined")
				return;

		var tablet_change = false;
		if (number_of_tablets != pattern.number_of_tablets)
			tablet_change = true;

		var row_change = false;
		if (number_of_rows != pattern.number_of_rows)
			row_change = true;

		var weaving_array = Meteor.my_functions.get_weaving_as_array(number_of_rows, number_of_tablets);

		Meteor.call('save_weaving_to_db', pattern_id, JSON.stringify(weaving_array), number_of_rows, number_of_tablets, function(error, result){
				Meteor.my_functions.store_pattern(pattern_id);
				
				Session.set("number_of_rows", number_of_rows);
				Session.set("number_of_tablets", number_of_tablets);

				if (tablet_change)
				{
					Meteor.my_functions.save_threading_to_db(pattern_id, number_of_tablets);
					Meteor.my_functions.save_orientation_to_db(pattern_id);
					Meteor.my_functions.update_after_tablet_change();

					if (pattern.edit_mode == "simulation")
					{
						Meteor.call("save_manual_weaving_turns", pattern_id, Meteor.my_functions.get_manual_weaving_as_array(pattern_id), function(){
							 Meteor.my_functions.reset_simulation_weaving(pattern_id);
							 // do not reset change_tablets_latch because this function will be called again but without tablet_change. Must ensure no new tablet or row change is initiated until this is complete.
						})
					} else {
						Session.set('change_tablets_latch', false);
					}
				} else {
					Session.set('change_tablets_latch', false);
				}

				if (row_change)
				{
					Meteor.my_functions.update_after_tablet_change();
				}

				Meteor.my_functions.save_preview_as_text(pattern_id);
			});
		
		Session.set('edited_pattern', true);
	},
	get_manual_weaving_as_array: function(pattern_id)
	{
		// convert the reactive array to a regular array that can be stringified
		var manual_weaving_turns = new Array();
		var data = current_manual_weaving_turns.list();

		for (var i=0; i<data.length; i++)
		{
			manual_weaving_turns[i] = data[i];
		}

		return JSON.stringify(manual_weaving_turns);
	},
	get_threading_as_array: function(number_of_tablets)
	{
		// turn the reactive array of objects into simple nested arrays of style values
		var threading_array = new Array(4);

		for (var i=0; i<4; i++)
		{
			threading_array[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				// during updates, the object may be undefined e.g. if a tablet was removed
				//if (typeof current_threading[(i + 1) + "_" + (j + 1)] undefined continue);

				threading_array[i][j] = current_threading[(i + 1) + "_" + (j + 1)].get();
			}
		}

		return threading_array;
	},
	get_auto_turn_sequence_as_array: function()
	{
		var auto_turn_sequence = [];

		for (var i=0; i<current_auto_turn_sequence.length; i++)
		{
			auto_turn_sequence[i] = current_auto_turn_sequence[i].direction;
		}

		return auto_turn_sequence;
	},
	save_threading_to_db: function(pattern_id, number_of_tablets)
	{
		var threading_array = Meteor.my_functions.get_threading_as_array(number_of_tablets);

		Meteor.call('save_threading_to_db', pattern_id, JSON.stringify(threading_array), function(error, result){
			if (error)
				console.log("Error from server " + error);
		});
	},
	save_weft_color_to_db: function(pattern_id, color)
	{
		Meteor.call('save_weft_color_to_db', pattern_id, color);
	},
	get_orientation_as_array: function()
	{
		// this can be called while a tablet is being deleted, so don't use the Session var
		number_of_tablets = Object.keys(current_orientation).length;
		var orientation_array = new Array();

		for (var i=0; i<number_of_tablets; i++)
		{
			orientation_array.push(current_orientation[i + 1].get());
		}

		return orientation_array;
	},
	save_orientation_to_db: function(pattern_id)
	{
		var orientation_array = Meteor.my_functions.get_orientation_as_array(pattern_id);

		Meteor.call('save_orientation_to_db', pattern_id, JSON.stringify(orientation_array)); 

	},
	get_styles_as_array: function(pattern_id)
	{
		var styles_array = [];
		for (var i=0; i<current_styles.length; i++)
		{
			styles_array[i] = jQuery.extend({}, current_styles[i]);
		}

		return styles_array;
	},
	save_styles_to_db: function(pattern_id)
	{
		var styles_array = Meteor.my_functions.get_styles_as_array(pattern_id);

		Meteor.call('save_styles_to_db', pattern_id, JSON.stringify(styles_array));
		Session.set('edited_pattern', true);
	},
	save_preview_as_text: function(pattern_id)
	{
		// save the auto-generated preview to the database as a string
		// delay to allow the last cell to be rendered
		// It doesn't seem to be worth drawing this when patterns load, it's no quicker. and the whole thing has to be redrawn if you start editing. But it can be used outside the pattern view.
		setTimeout( function(){
			if (typeof $('.auto_preview .holder')[0] === "undefined") // user has switched to another screen? There is no auto preview in the doc
					return;

			var preview = $('.auto_preview .holder').clone()[0]; // use a deep copy not a reference

			// don't show the row highlight in the saved image
			$(preview).find('.row_highlight').remove();

			// don't show the row numbers in the saved image
			$(preview).find('.text').remove();

			Meteor.call('save_preview_as_text', pattern_id, preview.innerHTML);
		}, 2000);
	},
	///////////////////////////////
	// Color pickers
	initialize_weft_color_picker: function()
	{
		// Set the #weft_colorpicker to the selected style's weft colour
		var pattern_id = Router.current().params._id;

		// pattern not loaded or preview not built
		if (!Meteor.my_functions.pattern_exists(pattern_id) ||
			($("#weft_colorpicker").length == 0))
		{
			setTimeout(function(){Meteor.my_functions.initialize_weft_color_picker(); }, 10);
		}
		else
		{
			var pattern = Patterns.findOne({_id:pattern_id}, {fields: {weft_color: 1}})
			var color = pattern.weft_color;

			if (typeof color === "undefined") // pattern was created before weft color was added
			{
				color = Meteor.settings.public.default_weft_color; // default for new patterns

				var pattern_id = Router.current().params._id;

				weft_color.set(color);

				// update database
				Meteor.my_functions.save_weft_color_to_db(pattern_id, color);

				// store style for undo stack
				Meteor.my_functions.store_pattern(pattern_id);
			}

			// Spectrum color picker
			// https://atmospherejs.com/ryanswapp/spectrum-colorpicker
			// https://bgrins.github.io/spectrum/
			$("#weft_colorpicker").spectrum({
				color: color,
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
					var pattern_id = Router.current().params._id;

					weft_color.set(color.toHexString());

					// update database
					Meteor.my_functions.save_weft_color_to_db(pattern_id, color.toHexString());

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
	initialize_background_color_picker: function()
	{
		// Set the #background_colorpicker to the selected style's background colour
		var selected_style = Session.get("selected_style");

		if (!Meteor.my_functions.can_edit_style(selected_style))
				return;
			
		var pattern_id = Router.current().params._id;

		//if (Patterns.findOne({_id: pattern_id}) == null)
		//if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
		if (!Meteor.my_functions.pattern_exists(pattern_id))
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

					// simulation pattern, broken twill pattern: weaving chart styles must also be updated
					var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});
					if (pattern.edit_mode == "simulation" || pattern.edit_mode == "broken_twill")
					{
						var style_number = 7 + 4*7; // default to empty hole to avoid error

						if (selected_style.toString().charAt(0) == "S")
						{
							if (selected_style == "S7") // empty hole
							{
								style_number = 7 + 4*7;
							}
						}
						else // regular style
						{
							style_number = 7 + 4*(selected_style - 1);
						}

						for (var i=1; i<=4; i++)
						{
							style_number += 1;
							var obj = current_styles[style_number-1];
							obj.line_color = options.background_color;
							current_styles.splice(style_number-1, 1, obj);
						}
					}

					// update database
					Meteor.my_functions.save_styles_to_db(pattern_id);

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
	initialize_warp_color_picker: function()
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
				Meteor.my_functions.save_styles_to_db(pattern_id);

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
	///////////////////////////////
	// Edit style
	edit_style_warp: function(warp) {
	 var selected_style = Session.get("selected_style");
		var pattern_id = Router.current().params._id;

		var style = current_styles[selected_style-1];

		// update local reactiveArray
		var obj = current_styles[style.style-1];
		if (style.warp === warp)
			obj.warp = "none";

		else
			obj.warp = warp;

		current_styles.splice(style.style-1, 1, obj);

		// update database
		Meteor.my_functions.save_styles_to_db(pattern_id);
		Meteor.my_functions.store_pattern(pattern_id);
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

		Meteor.my_functions.clear_pattern_display_data();
		Meteor.my_functions.build_pattern_display_data(pattern_id);

		Session.set('edited_pattern', true);

		// set session variables to avoid checking db every time
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1, preview_rotation: 1}});

		Session.set("edit_mode", pattern.edit_mode);

		if (pattern.edit_mode == "simulation")
			Session.set("simulation_mode", pattern.simulation_mode);

		Session.set('can_edit_pattern', Meteor.my_functions.can_edit_pattern(pattern_id));

		Session.set("preview_rotation", pattern.preview_rotation);
	
		// intialise the 'undo' stack
		// ideally the undo stack would be maintained over server refreshes but I'm not sure a session var could hold multiple patterns, and nothing else except the database is persistent. Also it doesn't need to be reactive so a session var might be a performance hit.
		stored_patterns = [];
		Session.set('undo_stack_position', -1);
		Meteor.my_functions.store_pattern(pattern_id);

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		if (pattern.edit_mode === "simulation") {
			Meteor.my_functions.reset_simulation_weaving(pattern_id);
			Session.set('sim_weave_mode', "add_row");
			Session.set("row_to_edit", 1);
		}

		if (pattern.edit_mode === "broken_twill") {
			Meteor.my_functions.reset_broken_twill_weaving(pattern_id);
		}

		// ensure successive add / remove tablet operations don't interfere with each other
		Session.set('change_tablets_latch', false);
	},
	view_pattern_render: function(pattern_id) {
		Session.set('edit_style', false);
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		if ((typeof Session.get('styles_palette') === "undefined") || (pattern.edit_mode == "simulation"))
			Session.set('styles_palette', "styles_1");

		if (Session.equals('styles_palette', "special"))
			Session.set('show_special_styles', true);

		else
			Session.set('show_special_styles', false);

		Session.set("selected_style", 1);
		Session.set("selected_special_style", "S1");

		// broken twill tools
		if (pattern.edit_mode == "broken_twill")
			Session.set('twill_tool', "chart_color"); // default to set twill color
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
		if (($("#toolbar").length > 0) && $("#width").hasClass("freehand"))
		{
			// toolbar stays at top of screen
			//var toolbar_offset = $("#toolbar").position().top;
			//$("#toolbar .inner_tube").css("top", Math.max(-1 * toolbar_offset, 0));

			// toolbar stays at bottom of screen, just above styles palette
			var container_height = $("#width").innerHeight();
			var scroll_top = $("#width").scrollTop();
			var toolbar_top = container_height + scroll_top - $("#toolbar").outerHeight(true) - 4; // last item is to give space above styles palette
			$("#toolbar").css("top", toolbar_top);

			// toolbar stays at left edge of screen
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

		if (Meteor.userId()) // the user is signed in, look for the pattern in their profile
		{
			// create an empty array if there is no existing list of recent patterns for this user
			var recent_patterns = (typeof Meteor.user().profile.recent_patterns === "undefined") ? [] : Meteor.user().profile.recent_patterns;

			// is the pattern already in the list?
			var index = -1;
			for (var i=0; i < recent_patterns.length; i++)
			{
				if (recent_patterns[i].pattern_id == pattern_id)
				{
					index = i;
					break;
				}
			}

			if (index !== -1)
			{
				current_weave_row = typeof recent_patterns[i].current_weave_row !== "undefined" ? recent_patterns[i].current_weave_row : 1;
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
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: { weaving_start_row: 1}});

		var number_of_rows = Session.get("number_of_rows");

		if (pattern.weaving_start_row) {
			number_of_rows = number_of_rows - pattern.weaving_start_row + 1;
		}
	
		if (row_number >= number_of_rows + 1)
		{
			row_number = 1; // if at last row, go to first row

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
	weave_arrow_click: function(event)
	{
		switch(event.keyCode)
		{
			// up arrow
			case 38:
				var row_number = Session.get('current_weave_row') + 1;
				Meteor.my_functions.set_current_weave_row(row_number);
				break;

			// down arrow
			case 40:
				var row_number = Session.get('current_weave_row') - 1;
				Meteor.my_functions.set_current_weave_row(row_number);
				break;
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
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {current_weave_row: 1, weaving_start_row: 1}});

		if (typeof pattern === "undefined")
			return;

		var number_of_rows = Session.get("number_of_rows");

		var new_value = parseInt(index);
		if (isNaN(new_value))
		{
			// use the current value
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
		var number_of_rows = Session.get("number_of_rows");

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
	// Simulation patterns
	toggle_simulation_mode: function(pattern_id, simulation_mode) {
		Meteor.call("update_simulation_mode", pattern_id, simulation_mode, function(){
			Meteor.my_functions.reset_simulation_weaving(pattern_id, simulation_mode);
			Meteor.my_functions.set_repeats(pattern_id);
			Session.set("simulation_mode", simulation_mode);
		});
	},
	reset_simulation_weaving: function(pattern_id, simulation_mode) {
		Session.set("hide_preview", true); // force a clean refresh of the preview

		// remove and rebuild the current simulation pattern weaving
		var pattern = Patterns.findOne({_id: pattern_id});

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		// reset all tablets to start position
		var position_of_A = new Array();
		for (var i=0; i<number_of_tablets; i++)
		{
			position_of_A.push(0);
		}

		if (pattern.simulation_mode == "auto")
		{
			var weaving = new Array();
			var threading = Meteor.my_functions.get_threading_as_array(number_of_tablets);
			var orientations = Meteor.my_functions.get_orientation_as_array();
			
			var auto_turn_sequence =  Meteor.my_functions.get_auto_turn_sequence_as_array();
			var number_of_rows = auto_turn_sequence.length;

			// record which thread shows
			var auto_turn_threads = new Array();

			for (var j=0; j<number_of_rows; j++)
			{
				var tablet_directions = []; // for each tablet, which direction it turns
				var tablet_turns = []; // for each tablet, number of turns
				var direction = auto_turn_sequence[j]; // all tablets turn together
				var threading_row = []; // which thread shows in each tablet

				auto_turn_threads[j] = new Array();
				
				for (var i=0; i<number_of_tablets; i++)
				{
					// turn tablet
					if (direction == "F")
					position_of_A[i] = Meteor.my_functions.modular_add(position_of_A[i], 1, 4);

					else
						position_of_A[i] = Meteor.my_functions.modular_add(position_of_A[i], -1, 4);

					// which thread shows depends on direction of turn
					if (direction == "F") // show thread currently in position D
						var thread_to_show = Meteor.my_functions.modular_add( position_of_A[i], -1, 4);
					else // B: show thread in position A
						var thread_to_show = position_of_A[i];

					// threading[thread_to_show] = row of threading chart
					threading_row.push(threading[thread_to_show][i]);
					tablet_directions.push(direction);
					tablet_turns.push(1); // always turn 1

					auto_turn_threads[j][i] = thread_to_show;
				}
				
				var new_row = Meteor.my_functions.build_weaving_chart_row( number_of_tablets, threading_row, orientations, tablet_directions, tablet_turns);
				weaving.push(new_row);
			}

			var data = {
				weaving: JSON.stringify(weaving),
				number_of_rows: number_of_rows,
				position_of_A: JSON.stringify(position_of_A),
				auto_turn_threads: auto_turn_threads
			}

			Meteor.call("update_auto_weaving", pattern_id, data, function(){
				var pattern = Patterns.findOne({_id: pattern_id});

				Session.set("number_of_rows", number_of_rows);
				Meteor.my_functions.set_repeats(pattern_id);
				Meteor.my_functions.build_pattern_display_data(pattern_id);
				Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows, number_of_tablets);
				Meteor.my_functions.save_preview_as_text(pattern_id);
				Session.set("hide_preview", false);
			});
		}
		else if (pattern.simulation_mode == "manual")
		{
			////////////////
			// construct fresh pattern data
			var data = {
				number_of_tablets: number_of_tablets,
				threading: Meteor.my_functions.get_threading_as_array(number_of_tablets),
				orientations: Meteor.my_functions.get_orientation_as_array(),
				position_of_A: position_of_A,
				weaving: [],
				manual_weaving_turns: [JSON.parse(pattern.manual_weaving_turns)[0]], // remove manual_weaving_turns except first row which gives UI default
				manual_weaving_threads: [] // which thread shows
			}
 
			var manual_weaving_turns = JSON.parse(pattern.manual_weaving_turns);

			for (var i=1; i<manual_weaving_turns.length; i++)
			{
				data = Meteor.my_functions.weave_row(data, manual_weaving_turns[i]);
			}
				
			Meteor.call("update_manual_weaving", pattern_id, data, function(){
				var pattern = Patterns.findOne({_id: pattern_id}, {fields: {number_of_rows: 1}});
				Session.set("number_of_rows", pattern.number_of_rows);
				Meteor.my_functions.set_repeats(pattern_id);
				Meteor.my_functions.build_pattern_display_data(pattern_id);
				
				// TODO investigate whether this is required when it's not the user's pattern. No data will be saved to the db but the callbacks may be needed.
				Meteor.my_functions.save_weaving_to_db(pattern_id, pattern.number_of_rows, number_of_tablets);
				Meteor.my_functions.save_preview_as_text(pattern_id);
				Session.set("hide_preview", false);
			});
		}
	},
	weave_row: function(data, new_row_sequence) {
		var tablet_directions = []; // for each tablet, which direction it turns
		var tablet_turns = []; // for each tablet, number of turns
		var threading_row = [];
		var new_threads_row = [];

		if(data.number_of_tablets)

		// turn tablets
		for (var i=0; i<data.number_of_tablets; i++)
		{
			// find turn direction and number of turns
			var pack_number = new_row_sequence.tablets[i];
			var pack = new_row_sequence.packs[pack_number - 1];
			var direction = pack.direction;
			var number_of_turns = pack.number_of_turns;

			// turn tablet
			if (direction == "F")
				data.position_of_A[i] = Meteor.my_functions.modular_add(data.position_of_A[i], number_of_turns, 4);

			else
				data.position_of_A[i] = Meteor.my_functions.modular_add(data.position_of_A[i], -1 * number_of_turns, 4);

			// which thread shows depends on direction of turn
			if (direction == "F") // show thread currently in position D
				var thread_to_show = Meteor.my_functions.modular_add(data.position_of_A[i], -1, 4);
			else // B: show thread in position A
				var thread_to_show = data.position_of_A[i];

			// threading[thread_to_show] = row of threading chart
			threading_row.push(data.threading[thread_to_show][i]);
			tablet_directions.push(direction);
			tablet_turns.push(number_of_turns);

			new_threads_row.push(thread_to_show);
		}

		var new_row = Meteor.my_functions.build_weaving_chart_row(data.number_of_tablets, threading_row, data.orientations, tablet_directions, tablet_turns);

		data.weaving.push(new_row);
		data.manual_weaving_threads.push(new_threads_row);

		// save the new row turning sequence
		data.manual_weaving_turns.push(new_row_sequence);
		data.manual_weaving_turns[0] = new_row_sequence; // retain current packs UI

		return data;
	},
	build_weaving_chart_row: function(number_of_tablets, threading_row, orientations, tablet_directions, tablet_turns)
	{
		var new_row = new Array(number_of_tablets);

		for (var i=0; i<number_of_tablets; i++)
		{
			var thread_style = threading_row[i];
			var orientation = orientations[i];
			new_row[i] = Meteor.my_functions.weaving_style_from_threading_style(thread_style, orientation, tablet_directions[i], tablet_turns[i]);
		}
		return new_row;
	},
	weaving_style_from_threading_style: function(style_value, orientation, direction, number_of_turns)
	{
		// which style to use on the weaving chart to represent a tablet turning forwards / backwards, with S /Z orientation, and thread colour from threading style
		// simulation styles for weaving appear after the 7 threading styles
		// SF, ZF, ZB, SB are style no. 7 + 4(n-1) + 1,2,3,4

		if (!Meteor.my_functions.is_style_special(style_value) || (number_of_turns > 1)) // if more than 1 turn, then we use the multi-turn special style even when the hole is unthreaded
		{
			switch(number_of_turns)
			{
				case 0:
					style_name = "S15";
					return style_name;
					break;
				case 2:
					var style_name = "S"

					if(direction == "F")
					{
						if (orientation == "S")
							style_name += 1
						else
							style_name += 2
					}
					else
					{
						if (orientation == "Z")
							style_name += 10
						else
							style_name += 9
					}
					return style_name;
					break;

				case 3:
					var style_name = "S"

					if(direction == "F")
					{
						if (orientation == "S")
							style_name += 3
						else
							style_name += 4
					}
					else
					{
						if (orientation == "Z")
							style_name += 12
						else
							style_name += 11
					}
					return style_name;
					break;

				default:
					var style_number = 7 + 4*(style_value - 1);
			}      
		}
		else
		{
			// special style for empty hole, hard-coded to last 4 styles
			if (style_value == "S7")
				var style_number = 7 + 4*7 // this is the 8th style (7-1)
			else
				return -1; // style does not correspond to a weaving chart style
		}
		if(direction == "F")
		{
			if (orientation == "S")
				style_number += 1
			else
				style_number += 2
		}
		else
		{
			if (orientation == "Z")
				style_number += 3
			else
				style_number += 4
		}
		return style_number;
	},
	modular_add: function(a, b, modulus)
	{
		// addition in modular arithmetic
		var result = (a + b) % modulus;

		if (result < 0)
			result += modulus;
		
		return result;
	},
	modular_subtract: function(a, b, modulus)
	{
		// addition in modular arithmetic
		var result = (a - b) % modulus;

		if (result < 0)
			result += modulus;
		
		return result;
	},
	weave_button: function(pattern_id) {
		// weave a new row to a simulation / manual pattern
		var pattern = Patterns.findOne({_id: pattern_id});

		if (pattern.edit_mode != "simulation")
				return;

		if (pattern.simulation_mode == "manual")
		{
			// packs shown in UI
			var new_row_sequence = current_manual_weaving_turns.list()[0];

			data = {
				number_of_tablets: Session.get("number_of_tablets"),
				threading: JSON.parse(pattern.threading),
				orientations: JSON.parse(pattern.orientation),
				position_of_A: JSON.parse(pattern.position_of_A),
				weaving: JSON.parse(pattern.weaving),
				manual_weaving_turns: JSON.parse(pattern.manual_weaving_turns),
				manual_weaving_threads: pattern.manual_weaving_threads // which thread shows
			}

			data = Meteor.my_functions.weave_row(data, new_row_sequence);

			Meteor.call("update_manual_weaving", pattern_id, data, function(){
				//Session.set("number_of_rows", Session.get("number_of_rows"));
				Meteor.my_functions.set_repeats(pattern_id);
				Meteor.my_functions.build_pattern_display_data(pattern_id);
				Meteor.my_functions.save_weaving_to_db(pattern_id, Session.get("number_of_rows"), Session.get("number_of_tablets"));
				Meteor.my_functions.save_preview_as_text(pattern_id);
			});
		}
	},
	unweave_button: function(pattern_id) {
		// remove the last row of a simulation / manual pattern
		var pattern = Patterns.findOne({_id: pattern_id});

		if (pattern.edit_mode != "simulation")
				return;

		if (pattern.simulation_mode == "manual")
		{
			data = {
				number_of_tablets: Session.get("number_of_tablets"),
				orientations: JSON.parse(pattern.orientation),
				position_of_A: JSON.parse(pattern.position_of_A),
				weaving: JSON.parse(pattern.weaving),
				manual_weaving_turns: JSON.parse(pattern.manual_weaving_turns),
				manual_weaving_threads: pattern.manual_weaving_threads // which thread shows
			}

			var current_row_number = data.manual_weaving_turns.length;
			var last_row_number = current_row_number - 1;
			var new_row_sequence = data.manual_weaving_turns[last_row_number];

			if (current_row_number <= 1)
				return; // no rows to unweave

			var last_row_data = data.manual_weaving_turns[last_row_number];

			// set working row to the last remaining row after the unweave
			// or if this is row 1, it will be the just-removed row 1
			data.manual_weaving_turns[0] = data.manual_weaving_turns[last_row_number-1];

			var tablet_directions = []; // for each tablet, which direction it turns

			// turn tablets
			for (var i=0; i<data.number_of_tablets; i++)
			{
				// find turn direction and number of turns
				var pack_number = new_row_sequence.tablets[i];
				var pack = new_row_sequence.packs[pack_number - 1];
				var direction = pack.direction;
				var number_of_turns = pack.number_of_turns;
				var last_row_pack = last_row_data.tablets[i];
				var last_direction =  last_row_data.packs[last_row_pack - 1].direction;

				var change_position = true;
				if ((direction != last_direction) || (current_row_number == 1))
					change_position = false;

				// if change of direction, no net turn
				// first row shows position 0
				if (change_position)
				{
					if (direction == "F")
					data.position_of_A[i] = Meteor.my_functions.modular_add( data.position_of_A[i], -1 *number_of_turns, 4);

					else
						data.position_of_A[i] = Meteor.my_functions.modular_add( data.position_of_A[i],  number_of_turns, 4);
				}
			}

			data.weaving.pop(); // remove last row of weaving chart
			data.manual_weaving_turns.pop();
			data.manual_weaving_threads.pop();

			Meteor.call("update_manual_weaving", pattern_id, data, function(){
				Session.set("number_of_rows", Session.get("number_of_rows") - 1);
				Meteor.my_functions.set_repeats(pattern_id);
				Meteor.my_functions.build_pattern_display_data(pattern_id);
				Meteor.my_functions.save_weaving_to_db(pattern_id, Session.get("number_of_rows"), Session.get("number_of_tablets"));
				Meteor.my_functions.save_preview_as_text(pattern_id);
			});
		}
	},
	edit_row_button: function(pattern_id, row_to_edit) {
		var pattern = Patterns.findOne({_id: pattern_id});

		if (pattern.edit_mode != "simulation")
				return;
		if (pattern.simulation_mode == "manual")
		{
			// rebuild the pattern from the new row onwards
			Session.set("hide_preview", true); // force a clean refresh of the preview

			var pattern = Patterns.findOne({_id: pattern_id});

			var number_of_rows = Session.get("number_of_rows");
			var number_of_tablets = Session.get("number_of_tablets");
			var rows_to_replace = number_of_rows - row_to_edit + 1;

			// set data to row before edited row
			//var position_of_A = JSON.parse(pattern.position_of_A);
			var manual_weaving_turns = JSON.parse(pattern.manual_weaving_turns);
			var manual_weaving_threads = pattern.manual_weaving_threads;
			var weaving = JSON.parse(pattern.weaving);

			// find position_of_A based on thread to show and whether tablet turned forwards or backwards

			var position_of_A = [];

			// previous row, thread to show
			if (row_to_edit == 1) { // row 1 starts with all tablets in position 0
				for (let i=0; i<number_of_tablets; i++) {
					position_of_A.push(0);
				}
			} else { // subsequent rows. Position of A depends on previous row
				var last_row_threads = manual_weaving_threads[row_to_edit - 2]; // -1 for last row, -1 for array starts with 0
				// previous row, turning sequence
				var last_row_turns = manual_weaving_turns[row_to_edit - 1];

				for (let i=0; i<number_of_tablets; i++) {
					var pack_index = last_row_turns.tablets[i] -1;
					var direction = last_row_turns.packs[pack_index].direction;
					if (direction == "F") {
						// hole in position D shows
						let position = Meteor.my_functions.modular_add(last_row_threads[i], 1, 4);
						position_of_A.push(position);
					} else {
						// B. Hole in position A shows
						position_of_A.push(last_row_threads[i]);
					}
				}
			}

			// use UI data for weaving turns in the row to edit
			var obj = current_manual_weaving_turns.valueOf()[0];
			current_manual_weaving_turns.splice(row_to_edit, 1, obj);

			manual_weaving_turns.splice(row_to_edit, rows_to_replace); // element 0 is for working. Corresponds to current_manual_weaving_turns. Row 1 is element 1.

			manual_weaving_threads.splice(row_to_edit - 1, rows_to_replace);
			// element 0 is row 1

			weaving.splice(row_to_edit - 1, rows_to_replace);
			// element 0 is row 1

			data = {
				number_of_tablets: number_of_tablets,
				threading: JSON.parse(pattern.threading),
				orientations: JSON.parse(pattern.orientation),
				position_of_A: position_of_A,
				weaving: weaving,
				manual_weaving_turns: manual_weaving_turns,
				manual_weaving_threads: manual_weaving_threads // which thread shows
			}

			for (let i=manual_weaving_turns.length; i<=number_of_rows; i++)
			{
				var new_row_sequence = current_manual_weaving_turns.list()[i];

				data = Meteor.my_functions.weave_row(data, new_row_sequence);
			}

			Meteor.call("update_manual_weaving", pattern_id, data, function(){
				//console.log('callback 1');
				Meteor.my_functions.set_repeats(pattern_id);
				Meteor.my_functions.build_pattern_display_data(pattern_id);
				Meteor.my_functions.save_weaving_to_db(pattern_id, Session.get("number_of_rows"), Session.get("number_of_tablets"));
				Meteor.my_functions.save_preview_as_text(pattern_id);
				Session.set("hide_preview", false);
				//console.log('callback 2');
			});
		}
	},
	set_repeats: function(pattern_id) {
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, simulation_mode: 1, auto_turn_sequence: 1, preview_rotation: 1}});

		var number_of_repeats = 1;

		// repeats are only shown on horizontal preview for auto simulation patterns
		if ((pattern.edit_mode == "simulation") && (pattern.simulation_mode == "auto") && (Session.get("preview_rotation") !== "up") &&
			Meteor.my_functions.does_pattern_repeat(pattern_id)) {
				number_of_repeats = Math.floor(Meteor.my_params.max_auto_turns/pattern.auto_turn_sequence.length);
		}

		Session.set("number_of_repeats", number_of_repeats);
	},
	does_pattern_repeat: function(pattern_id) {
		var pattern = Patterns.findOne({ _id: pattern_id}, {fields: {edit_mode: 1, position_of_A: 1}});

		if (pattern.edit_mode != "simulation") // freehand patterns do not track rotation of tablets
			return;

		var position_of_A = JSON.parse(pattern.position_of_A);
		var does_pattern_repeat = true;

		for (var i=0; i<position_of_A.length; i++)
		{
			if (position_of_A[i] != 0) // tablet is not in position A
			{
				does_pattern_repeat = false;
				break;
			} 
		}
		return does_pattern_repeat;
	},
	change_sim_thread_color: function(pattern_id, tablet, hole, old_style, new_style) {
		// update simulation pattern with different colour, no changes to rows, tablets or turning
		// only color styles will change
		// find the four old corresponding weaving chart styles
		// map them to the four new styles
		// replace old with new in weaving chart

		var pattern = Patterns.findOne({_id: pattern_id});

		if (pattern.edit_mode != "simulation" && pattern.edit_mode != "broken_twill")
					return;

		var old_weaving_styles = Meteor.my_functions.map_weaving_styles(old_style);
		//console.log(`change sim thread colour. hole ${hole}`);
		//console.log(`old_style ${old_style}`);
		//console.log(`new_style ${new_style}`);
		var new_weaving_styles = Meteor.my_functions.map_weaving_styles(new_style);

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		if (pattern.simulation_mode == "auto")
			var threads = pattern.auto_turn_threads;
		else // broken twill pattern also satisfies this condition
			var threads = pattern.manual_weaving_threads;

		if (typeof pattern.weaving_start_row !== "undefined") {
			const offset = (pattern.weaving_start_row + 1) % 4;
			//hole = Meteor.my_functions.modular_add(offset, hole - 1, 4) + 1;
		}

		// Weaving chart
		for (var i=0; i<number_of_rows; i++)
		{
			//console.log(`row ${i+1}`);
			var weaving_cell_index = (i+1) + "_" + tablet;
			var cell_style = current_weaving[weaving_cell_index].get();
			var thread_to_show = threads[i][tablet-1];
//console.log(`thread_to_show ${thread_to_show}`);
//console.log(`weaving_cell_index ${weaving_cell_index}`);
			if (thread_to_show + 1 == hole)
			{   
				//console.log(`match`);
				for (var k=0; k<4; k++)
				{
					if (cell_style == old_weaving_styles[k]) {
						current_weaving[weaving_cell_index].set(new_weaving_styles[k]);
					}
				}
			}     
		}

		Meteor.my_functions.save_weaving_to_db(pattern_id, number_of_rows, number_of_tablets);
	},
	map_weaving_styles: function(style_value)
	{
		var weaving_styles = [];

		// special style for empty hole, hard-coded to last 4 styles
		if (style_value == "S7")
			var style_number = 7 + 4*7; // this is the 8th style (7-1)

		else if (typeof style_value === "number")
			var style_number = 7 + 4*(style_value - 1);

		else // all threading chart styles have been included
			return;

		for (var i=0; i<4; i++)
		{
			weaving_styles[i] = style_number + i + 1;
		}

		return weaving_styles;
	},
	///////////////////////////////////
	// 3/1 Broken twill patterns
	reset_broken_twill_weaving: function(pattern_id) {
		// remove and rebuild the current simulation pattern weaving
		var pattern = Patterns.findOne({_id: pattern_id});

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		// reset all tablets to start position
		var position_of_A = new Array();
		for (var i=0; i<number_of_tablets; i++)
		{
			position_of_A.push(0);
		}

		// construct fresh pattern data
		var data = {
			number_of_tablets: number_of_tablets,
			threading: Meteor.my_functions.get_threading_as_array(number_of_tablets),
			orientations: Meteor.my_functions.get_orientation_as_array(),
			position_of_A: position_of_A,
			weaving: [],
			manual_weaving_turns: [current_manual_weaving_turns[0]], // remove manual_weaving_turns except first row which gives UI default
			manual_weaving_threads: [] // which thread shows
		}

		var manual_weaving_turns = current_manual_weaving_turns;

		// weaving chart may start at a later row
		// to allow the background twill to be set up for a repeating pattern
		var temp_offset_threading = {};
		current_A_start = [];

		for (var i=1; i<manual_weaving_turns.length; i++)
		{
			if (i == pattern.weaving_start_row) { // first row of actual weaving
				for (var k=0; k<4; k++) { // 4 holes
					for (var l=0; l<number_of_tablets; l++) {
						const thread_at_A = (k + data.position_of_A[l]) % 4;
						let hole_style = current_threading[(thread_at_A+1) + "_" + (l+1)].get();
						temp_offset_threading[(k+1) + "_" + (l+1)] = new ReactiveVar(hole_style);
					}
				}
				
				current_offset_threading = temp_offset_threading;
				current_A_start = JSON.parse(JSON.stringify(data.position_of_A));
			}
			data = Meteor.my_functions.weave_row(data, manual_weaving_turns[i]);  
		}
			
		Meteor.call("update_manual_weaving", pattern_id, data, function(){
			var pattern = Patterns.findOne({_id: pattern_id}, {fields: {number_of_rows: 1}});
			Session.set("number_of_rows", pattern.number_of_rows);

			Meteor.my_functions.set_repeats(pattern_id);
			Meteor.my_functions.build_pattern_display_data(pattern_id);
			
			// TODO investigate whether this is required when it's not the user's pattern. No data will be saved to the db but the callbacks may be needed.
			Meteor.my_functions.save_weaving_to_db(pattern_id, pattern.number_of_rows, number_of_tablets);
			Meteor.my_functions.save_preview_as_text(pattern_id);
		});    
	},
	find_threading_from_offset: function(pattern_id, hole, tablet) {
		var pattern = Patterns.findOne({_id: pattern_id});
		const weaving_start_row = pattern.weaving_start_row;
		const thread_to_show = pattern.manual_weaving_threads[weaving_start_row - 1][tablet-1];

		// wind back to find the hole in the original threading chart that corresponds to this hole in the offset threading chart
		const original_hole = Meteor.my_functions.modular_subtract(hole - 1, thread_to_show, 4);

		const turns = current_manual_weaving_turns[weaving_start_row].valueOf();
		const pack_index = turns.tablets[tablet - 1] - 1;
		const direction = turns.packs[pack_index].direction;

		if (direction == "B") { // hole 3 shows not hole 0
			original_hole = Meteor.my_functions.modular_add(original_hole, 3, 4);
		}

		return original_hole + 1; // convert from index to hole number
	},
	find_offset_from_threading: function(pattern_id, hole, tablet) {
		var pattern = Patterns.findOne({_id: pattern_id});
		const weaving_start_row = pattern.weaving_start_row;
		const thread_to_show = pattern.manual_weaving_threads[weaving_start_row - 1][tablet-1];

		// wind forward to find the hole in the offset threading chart that corresponds to this hole in the original threading chart
		const offset_hole = Meteor.my_functions.modular_add(hole - 1, thread_to_show, 4);

		const turns = current_manual_weaving_turns[weaving_start_row].valueOf();
		const pack_index = turns.tablets[tablet - 1] - 1;
		const direction = turns.packs[pack_index].direction;

		if (direction == "B") { // hole 3 shows not hole 0
			offset_hole = Meteor.my_functions.modular_subtract(offset_hole, 3, 4);
		}

		return offset_hole + 1; // convert from index to hole number
	},
	rebuild_offset_threading: function(pattern_id, weaving_start_row) {
		// rebuild the threading chart if the weaving_start_row has changed
		// remove and rebuild the current simulation pattern weaving
		var pattern = Patterns.findOne({_id: pattern_id});

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		// reset all tablets to start position
		var position_of_A = new Array();
		for (var i=0; i<number_of_tablets; i++)
		{
			position_of_A.push(0);
		}

		// construct fresh pattern data
		// although we only actually need the position_of_A
		var data = {
			number_of_tablets: number_of_tablets,
			threading: Meteor.my_functions.get_threading_as_array(number_of_tablets),
			orientations: Meteor.my_functions.get_orientation_as_array(),
			position_of_A: position_of_A,
			weaving: [],
			manual_weaving_turns: [current_manual_weaving_turns[0]], // remove manual_weaving_turns except first row which gives UI default
			manual_weaving_threads: [] // which thread shows
		}

		var manual_weaving_turns = current_manual_weaving_turns;
		
		// weaving chart may start at a later row
		// to allow the background twill to be set up for a repeating pattern
		temp_offset_threading = {};
		for (var i=1; i<manual_weaving_turns.length; i++)
		{
			if (i == weaving_start_row) { // first row of actual weaving
				for (var k=0; k<4; k++) { // 4 holes
					for (var l=0; l<number_of_tablets; l++) {
						const thread_at_A = (k + data.position_of_A[l]) % 4;
						let hole_style = current_threading[(thread_at_A+1) + "_" + (l+1)].get();
						temp_offset_threading[(k+1) + "_" + (l+1)] = new ReactiveVar(hole_style);
					}
				}
				current_offset_threading = temp_offset_threading;
				current_A_start = JSON.parse(JSON.stringify(data.position_of_A));
				return;
			}

			data = Meteor.my_functions.weave_row(data, manual_weaving_turns[i]);  
		}
	},
	/////////////////////////////////
	twill_tool_clicked: function(twill_tool)
	{
		Session.set('twill_tool', twill_tool);
	},


	/////////////////////////////////
	update_twill_pattern_chart: function(pattern_id, row, tablet) {
		// update the twill pattern, changing only the affected tablet

		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		if (pattern.edit_mode != "broken_twill")
				return;

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		const data = {
			twill_pattern_chart: Meteor.my_functions.get_twill_pattern_chart_as_array(number_of_rows + 2, number_of_tablets)
		}

		Meteor.my_functions.update_broken_twill_pattern(pattern_id, row, tablet);

		Meteor.call("update_twill_pattern_chart", pattern_id, data, function() {
		});
	},
	get_twill_pattern_chart_as_array: function(number_of_rows, number_of_tablets)
	{
		// turn the reactive array of objects into simple nested arrays of chart values
		if (number_of_rows % 2 !== 0)
		{
			console.log("Error in get_twill_pattern_chart_as_array: number of rows must be even");
		}
		var twill_array = new Array(number_of_rows/2);

		for (var i=0; i<number_of_rows/2; i++)
		{
			twill_array[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				var item = current_twill_pattern_chart[(i+1) + "_" + (j+1)];
				if (typeof item !== "undefined")
				{
					twill_array[i][j] = item.get();
				}

				else
				{
					console.log("non-existent item in get_twill_pattern_chart_as_array");
					console.log("identifier " + (i+1) + "_" + (j+1));
				}
			}
		}

		return twill_array;
	},
	update_twill_change_chart: function(pattern_id, row, tablet) {
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1}});

		if (pattern.edit_mode != "broken_twill")
				return;

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		const data = {
			twill_change_chart: Meteor.my_functions.get_twill_change_chart_as_array(number_of_rows + 2, number_of_tablets)
		}

		Meteor.my_functions.update_broken_twill_pattern(pattern_id, row, tablet);

		Meteor.call("update_twill_change_chart", pattern_id, data, function() {       
		});
	},
	get_twill_change_chart_as_array: function(number_of_rows, number_of_tablets)
	{
		// turn the reactive array of objects into simple nested arrays of chart values
		if (number_of_rows % 2 !== 0)
		{
			console.log("Error in get_twill_change_chart_as_array: number of rows must be even");
		}
		var twill_array = new Array(number_of_rows/2);

		for (var i=0; i<number_of_rows/2; i++)
		{
			twill_array[i] = new Array(number_of_tablets);

			for (var j=0; j<number_of_tablets; j++)
			{
				var item = current_twill_change_chart[(i+1) + "_" + (j+1)];
				if (typeof item !== "undefined")
				{
					twill_array[i][j] = item.get();
				}

				else
				{
					console.log("non-existent item in get_twill_pattern_chart_as_array");
					console.log("identifier " + (i+1) + "_" + (j+1));
				}
			}
		}

		return twill_array;
	},
	update_twill_charts: function(pattern_id, number_of_rows, number_of_tablets) {
		var pattern = Patterns.findOne({_id: pattern_id}, {fields: {edit_mode: 1, number_of_tablets: 1}});

		if (pattern.edit_mode != "broken_twill")
				return;

		const data = {
			twill_pattern_chart: Meteor.my_functions.get_twill_pattern_chart_as_array(number_of_rows + 2, number_of_tablets),
			twill_change_chart: Meteor.my_functions.get_twill_change_chart_as_array(number_of_rows + 2, number_of_tablets),
			weaving: Meteor.my_functions.get_weaving_as_array(number_of_rows, number_of_tablets)
		}

		// tablet change
		if (pattern.number_of_tablets !== number_of_tablets) {
			data.orientation = Meteor.my_functions.get_orientation_as_array();
			data.threading = Meteor.my_functions.get_threading_as_array(number_of_tablets);
		}

		Meteor.call("update_twill_charts", pattern_id, data, number_of_rows, number_of_tablets, function() {
			Meteor.my_functions.build_pattern_display_data(pattern_id);
			Meteor.my_functions.reset_broken_twill_weaving(pattern_id);
			Meteor.my_functions.save_preview_as_text(pattern_id);       
		});
	},
	update_broken_twill_pattern: function(pattern_id, row, tablet) {
		// rebuild the manual weaving turns after a change to either twill pattern chart or twill change chart
		var pattern = Patterns.findOne({_id: pattern_id});

		var number_of_rows = Session.get("number_of_rows");
		var number_of_tablets = Session.get("number_of_tablets");

		// get the twill charts for the changed tablet only
		// twill charts have one row per two rows of weaving
		var raw_pattern_chart = [];
		var raw_twill_change_chart = [];

		for (var i=0; i<(number_of_rows + 2)/2; i++)
		{
			raw_pattern_chart[i] = [current_twill_pattern_chart[(i+1) + "_" + tablet].get()];

			raw_twill_change_chart[i] = [current_twill_change_chart[(i+1) + "_" + tablet].get()];
		}

		var twill_pattern_chart = []; // array for internal working in this function

		// each row of raw pattern data corresponds to two picks, offset alternately
		// build charts with one row per one row of weaving
		for (var i=0; i<raw_pattern_chart.length; i++)
		{
			var even_row = [];
			even_row.push(raw_pattern_chart[i][0]);

			twill_pattern_chart.push(even_row);

			var odd_row = [];

			if (i == (raw_pattern_chart.length - 1)) // last row of Data
			{
				odd_row.push(raw_pattern_chart[i][0]);
			}
			else
			{
				if ((tablet - 1)%2 == 0)
					odd_row.push(raw_pattern_chart[i][0]);
				else
					odd_row.push(raw_pattern_chart[i+1][0]);
			}

			twill_pattern_chart.push(odd_row);
		}

		// build the long floats chart
		var twill_change_chart = []; // array for internal working in this function

		for(var i=0; i<raw_pattern_chart.length; i++)
		{
			var even_row = [];
			even_row.push(raw_twill_change_chart[i][0]);

			if (((tablet - 1)%2 == 1))
				if (even_row[0] == "X")
					even_row[0] = "Y";

			twill_change_chart.push(even_row);

			var odd_row = [];

			if (i == (raw_pattern_chart.length - 1)) // last row of LongFloats
			{
				odd_row.push(raw_twill_change_chart[i][0]);
			}
			else
			{
				if ((tablet - 1)%2 == 0)
					odd_row.push(raw_twill_change_chart[i][0]);
				else
					odd_row.push(raw_twill_change_chart[i+1][0]);
			}

			// replace X with Y in second row so we can identify first and second row of long float
			if ((tablet - 1)%2 == 0)
				if (odd_row[0] == "X")
					odd_row[0] = "Y";

			twill_change_chart.push(odd_row);
		}

		// create the pattern. This is from my_functions.convert_gtt_3_1_twill_pattern_to_json
		var twill_direction = pattern.twill_direction;
		
		var number_of_rows = number_of_rows; // last rows are only there to determine last even row of weaving

		var twill_sequence = ["F", "F", "B", "B"]; // turning sequence for an individual tablet to weave background twill

		var current_twill_position = []; // for each tablet, what stage is it at in the twill_sequence? 0, 1, 2, 3
		// tablets start with the previous row, so that if there is a color change in row 1, they will continue as in the non-existent previous row

		switch (twill_direction)
		{
			case "S":
				current_twill_position.push((tablet + 2) % 4);
				break;

			case "Z":
				current_twill_position.push(3 - ((tablet - 1) % 4));
				break;
		}

		// find threading of this tablet
		var threading = [];
		for (let i=0; i<=3; i++) {
			threading[i] = [current_threading[(i + 1) + "_" + tablet].get()];
		}

		var orientations = [Meteor.my_functions.get_orientation_as_array()[tablet-1]];

		// set up the pattern
		var pattern_obj = {
			manual_weaving_threads: [],
			manual_weaving_turns: [{}],
			weaving: [],
			position_of_A: [0],
			threading: threading,
			orientations: orientations,
			number_of_tablets: 1
		}

		// set up packs
		var new_turn = {
			tablets: [], // for each tablet, the pack number
			packs: [] // turning info for each pack
		}

		for (var i=1; i<=Meteor.my_params.number_of_packs; i++)
		{
			var pack = {
				pack_number: i,
				direction: (i == 2) ? "B" : "F", // second pack goes backwards
				number_of_turns: 1
			}
			new_turn.packs.push(pack);
		}

		// build the manual turn sequence and weave the pattern
		for (var i=0; i<number_of_rows; i++)
		{
			// put the tablets in the correct packs
			new_turn.tablets = [];

			// read the pattern chart
			var current_color = twill_pattern_chart[i][0];
			var next_color = current_color;
			var last_color = ".";
			var color_change = false;

			// check for color change
			// color change affects two rows
			if (i<(number_of_rows - 1)) // last row has no next row
			{
				next_color = twill_pattern_chart[i+1][0]; // problem
			}

			if (i > 0)
				last_color = twill_pattern_chart[i-1][0];

			if (next_color != current_color)
				color_change = true;

			if (last_color != current_color)
			{
				color_change = true;
				if (i == 0) // tablet starts with foreground color
					current_twill_position[0] =  (current_twill_position[0] + 3) % 4; // go back an extra turn
			}

			var long_float = twill_change_chart[i][0];

			var previous_long_float = ".";
			if (i != 0)
				previous_long_float = twill_change_chart[i-1][0];

			var next_long_float = ".";

			if ((i < number_of_rows - 1))
				next_long_float = twill_change_chart[i+1][0];     

			// handle long floats
			// advance in turning sequence
			if ((!color_change))

				 current_twill_position[0] =  (current_twill_position[0] + 1) % 4;        

			if ((long_float == "Y")) // second pick of long float
				current_twill_position[0] =  (current_twill_position[0] + 2) % 4;

			var position = current_twill_position[0];
			var direction = twill_sequence[position];

			var pack = (direction == "F") ? 1 : 2;
			new_turn.tablets.push(pack);

			pattern_obj = Meteor.my_functions.weave_row(pattern_obj, JSON.parse(JSON.stringify(new_turn)));
		}

		// update client-side reactive data
		for (let i=1; i<=number_of_rows; i++) {
			var new_turn = current_manual_weaving_turns[i].valueOf();
			new_turn.tablets[tablet - 1] = pattern_obj.manual_weaving_turns[i].tablets[0];
			current_manual_weaving_turns.splice(i, 1, new_turn);
			current_weaving[(i) + "_" + (tablet)].set(pattern_obj.weaving[i-1][0]);
		}

		// update database
		// current pattern data
		// construct changed manual weaving turns as new object not reference
		var manual_weaving_turns_full = [];

		// two twill chart rows per pattern row
		// plus a twill chart row for last row
		// full weaving chart
		for (let i=1; i<=Session.get("number_of_rows"); i++) {
			manual_weaving_turns_full.push(current_manual_weaving_turns[i].valueOf());
		}

		// there is no client-side version of manual_weaving_threads
		var manual_weaving_threads = pattern.manual_weaving_threads;

		var new_weaving_data = {
			position_of_A:JSON.parse(pattern.position_of_A),
			weaving: JSON.parse(pattern.weaving),
			manual_weaving_turns: manual_weaving_turns_full,
			manual_weaving_threads: manual_weaving_threads
		};

		// insert the new tablet data into the full charts
		new_weaving_data.position_of_A[tablet - 1] = pattern_obj.position_of_A[0];

		for (let i=1; i<=Session.get("number_of_rows"); i++) {
			let data_row = i - 1;		new_weaving_data.weaving[i-1][tablet-1] = pattern_obj.weaving[data_row][0];
			current_weaving[(i) + "_" + (tablet)].set(pattern_obj.weaving[data_row][0]);
			new_weaving_data.manual_weaving_threads[i-1][tablet-1] = pattern_obj.manual_weaving_threads[data_row][0];
		}
		
		Meteor.call("update_manual_weaving", pattern_id, new_weaving_data, function(){
			Meteor.my_functions.set_repeats(pattern_id);
			Meteor.my_functions.save_preview_as_text(pattern_id);
		}); 
	},
	///////////////////////////////////
	// Searching
	hide_search_results: function() {
		patternsIndex.getComponentMethods().search("");
		usersIndex.getComponentMethods().search("");
	},
	///////////////////////////////////
	// Pagination
	// These functions set a filter value without removing an existing filter by a different parameter
	set_tablets_filter: function(filter, min, max)
	{
		// filter must be an object
		if (max > 1)
		{
			filter.number_of_tablets = { "$lt": parseInt(max) + 1 };
			if (min < max)
				filter.number_of_tablets["$gt"] = parseInt(min) - 1;
		}
		else if (min > 1)
		{
			filter.number_of_tablets = { "$gt": parseInt(min) - 1 };
		}

		return filter;
	},
	set_created_by_filter: function(filter, user_id)
	{
		// filter must be an object
		filter.created_by = user_id;
		return filter;
	},
	///////////////////////////////////
	// File uploads
	upload_pattern_image: function(file, pattern_id)
	{
		var context = {pattern_id: pattern_id};
		var upload = new Slingshot.Upload("myImageUploads", context);

		var timeStamp = Math.floor(Date.now());                 
		{
			Session.set('upload_status', 'uploading');
			upload.send(file, function (error, downloadUrl) {
				uploader.set();
				if (error) {
					toastr.error("Upload failed. " + error.message);
				}
				else
				{
					toastr.success("File uploaded");

					//var img = document.createElement("img");
					var img = $('.image_uploader .preview img.hidden')[0];
					var sizeKB = file.size / 1024;
					img.onload = function() {

							var role = "image";
							if (Images.find({$and: [
								{ used_by: context.pattern_id },
								{ role: "preview"}]
							}).count() == 0)
							{
								role = "preview";
							}

							Meteor.call('upload_pattern_image', downloadUrl, pattern_id, role, img.naturalWidth, img.naturalHeight);
						}
						$('.image_uploader .preview img').attr("src", downloadUrl);
				}
			});
			uploader.set(upload);
		}
	},
	full_image_dimensions: function(width, height) {
		// This is here in case I decide to manually scale the image, so that the caption fits underneath better. But it would need logic to handle portrait and landscape image and container.

		// scale the full image for a pattern to fit nicely
		var container_width = Session.get('window_width') * 0.95; // 95% max width of wrapper is set in image.css
		var container_height = Session.get('window_height') * 0.80; // 90% max height of wrapper is set in image.css
		
		var dimensions = {
			width: width,
			height: height
		};
/*
		if (width > container_width)
		{
			console.log("wider");
		}

		if (height > container_height)
		{
			console.log("taller");
		}*/

		return dimensions;
	},
	//////////////////////////////////////////
	// Preview data as client-side object
	set_weaving_cell_style: function(row, tablet, style)
	{
		current_weaving[(row) + "_" + (tablet)].set(style);
	},
	// threading data as client-side object
	set_threading_cell_style: function(hole, tablet, style)
	{
		current_threading[(hole) + "_" + (tablet)].set(style);
	},
	// threading data as client-side object
	set_offset_threading_cell_style: function(hole, tablet, style)
	{
		current_offset_threading[(hole) + "_" + (tablet)].set(style);
	},
	// broken twill data as client-side object
	toggle_broken_twill_color: function(row, tablet)
	{
		const chart_value = current_twill_pattern_chart[(row) + "_" + (tablet)].get();

		var new_value = '.';

		if (chart_value == '.') {
			new_value = 'X';
		}

		current_twill_pattern_chart[(row) + "_" + (tablet)].set(new_value);
	},
	toggle_broken_twill_direction: function(row, tablet)
	{
		// toggle the reversal chart value
		var chart_value = current_twill_change_chart[(row) + "_" + (tablet)].get();
		if (chart_value == '.')
		{
			chart_value = "X";
		} else {
			chart_value = ".";
		}

		current_twill_change_chart[(row) + "_" + (tablet)].set(chart_value);
	},
	broken_twill_threading: function() {
		// table in Meteor.methods.new_pattern_from_json is similar but uses style 1 for Background, style 2 for Foreground
		return [
      ["B","B","F","B"], // hole 1
      ["B","F","F","F"], // hole 2
      ["F","F","B","F"], // hole 3
      ["F","B","B","B"] // hole 4
    ];
	},
	find_broken_twill_hole: function(hole, tablet)
	// broken twill threading is in pairs. Each tablet has two foreground, two background threads.
	// find the other thread for this tablet that is the same:
	// the other foreground thread, or the other background thread
	{
		const broken_twill_threading = Meteor.my_functions.broken_twill_threading();
    const tablet_index = (tablet - 1) % 4;
    const this_thread = broken_twill_threading[hole - 1][tablet_index];

    var other_hole;
    // find the other hole with the same thread, Foreground or Background
    for (let i=0; i<3; i++) {
    	// check the next three holes to find the other matching one
    	const index = (i + hole) % 4;
    	if (broken_twill_threading[index][tablet_index] == this_thread) {
    		other_hole = index + 1;
    		break;
    	}
    }
    if (typeof other_hole === "undefined") {
    	console.log(`Error in find_broken_twill_hole. No other hole found for row ${row}, tablet ${tablet}`);
    }
    return other_hole;
	},
	find_style: function(style_value) // e,g, 2, "S1", may be regular or special
	{
		if (typeof style_value === "undefined")
			return {};

		var style;
		var style_number;

		if (style_value == null)
		{
			// pattern has become corrupted, show a default style so the user can fix it
			style_value = 1;
		}

		if (style_value.toString().charAt(0) == "S")
		{
			special = true;
			style_number = parseInt(style_value.slice(1));
			style = current_special_styles[style_number-1];
			style.special = true;
		}
		else
		{
		 //style_number = style_value;
			style = current_styles.list()[style_value-1];
			style.special = false;
		}
		return style; // the style object
	},
	is_style_special: function(style_value)
	{
		if (typeof style_value === "undefined")
			return false;

		if (style_value == null)
			return false;

		if (style_value.toString().charAt(0) == "S")
			return true;

		else
			return false;
	},
	last_non_idle_style: function(row, tablet) // find the most recent non-idle style before this row.
	{
		var previous_style_value = current_weaving[row + "_" + (tablet)].get();

		for (var i = row-1; i> 0; i--)
		{
			var previous_style_value = current_weaving[i + "_" + (tablet)].get();

			if (!Meteor.my_functions.is_style_special(previous_style_value))
			{
				//if (Meteor.my_functions.find_style(previous_style_value).name != "idle")
				// TODO make sure this works for multiple turn followed by reversal, which is special but not idle!
					break;
			}
		}
		
		return Meteor.my_functions.find_style(previous_style_value);
	},
	////////////////////////////////////////////
	// work around frequent failure of Meteor to register clicks on Styles palette
	style_cell_clicked: function(style, special_style)
	{
		if ($('#width').hasClass("broken_twill")) {

			if (style == 3) {
				// style 3 in broken twill is used to apply twill direction change
				Session.set('edit_style', false);
			}
		}

		if(special_style)
		{
			Session.set("selected_special_style", style);
			if ($('#width').hasClass("simulation"))
				Meteor.my_functions.styles_pagination_clicked("special");
		}
		else
		{
			Session.set("selected_style", parseInt(style));
			Meteor.my_functions.update_color_pickers();

			if ($('#width').hasClass("simulation"))
				Meteor.my_functions.styles_pagination_clicked("all_styles");
		}
	},
	edit_style_clicked: function()
	{
		if (Session.equals('edit_style', true))
			Session.set('edit_style', false);

		else
			Session.set('edit_style', true); 
	},
	styles_pagination_clicked: function(page)
	{
		Session.set('styles_palette', page);

		if (page == "special")
		{
			Session.set('show_special_styles', true);

			if (Session.equals('edit_style', true))
				Session.set('edit_style', false);
		}

		else
			Session.set('show_special_styles', false);
	},
	string_exists(value)
	{
		// checks whether a string exists and is not empty
		if (typeof value !== "string")
			return false;

		if (value == "")
			return false;

		return true;
	},
	///////////////////////////////////
	// navigation
	// The router doesn't show the 'loading' template for these actions because only the data changes, not the route. So here we manually trigger a simple "Loading..." display to help the user when switching between view pattern and weave.
	start_weaving: function(disabled)
	{
		if (disabled == "disabled")
			return;

		Session.set("loading", true);

		var pattern_id = Router.current().params._id;
		setTimeout(function(){
			Router.go('pattern', { _id: pattern_id, mode: "weaving" });
		}, 100);
	},
	stop_weaving: function()
	{
		Session.set("loading", true);

		var pattern_id = Router.current().params._id;
		setTimeout(function(){
			if (Session.equals("view_pattern_mode", "charts"))
				Router.go('pattern', { _id: pattern_id, mode: "charts" });

			else
				Router.go('pattern', { _id: pattern_id, mode: "summary" });
		}, 100);
	},
	printer_friendly_pattern: function(disabled)
	{
		if (disabled == "disabled")
			return;

		var pattern_id = Router.current().params._id;

		Router.go('pattern', {_id: pattern_id, mode: "print"});
	}
}

