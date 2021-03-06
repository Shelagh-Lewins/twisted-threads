var Schema = new SimpleSchema({
	'auto_preview': {
		'type': String,
		'label': 'Auto preview',
		'optional': true,
	},
	'auto_turn_sequence': {
		'type': [String],
		'label': 'Auto turn sequence',
		'optional': true,
	},
	'auto_turn_threads': {
		'type': [[Number]],
		'label': 'Auto turn threads',
		'optional': true,
	},
	'created_at': {
		'type': Number,
		'label': 'Created at',
	},
	'created_by': {
		'type': String,
		'label': 'Created by',
	},
	'created_by_username': {
		'type': String,
		'label': 'Created by username',
	},
	'description': {
		'type': String,
		'label': 'Description',
		'optional': true,
	},
	'hole_handedness': {
		'type': String,
		'label': 'Hole handedness',
		'max': 50,
		'optional': true,
	},
	'edit_mode': {
		'type': String,
		'label': 'Edit mode',
		'max': 50,
		'optional': true,
	},
	'long_floats_chart': {
		'type': String,
		'label': 'Long floats grid',
		'max': 10000,
		'optional': true,
	},
	'name': {
		'type': String,
		'label': 'Name',
		'max': 200,
	},
	'manual_weaving_threads': {
		'type': [[Number]],
		'label': 'Manual weaving turns',
		'optional': true,
	},
	'manual_weaving_turns': {
		'type': String,
		'label': 'Manual weaving turns',
		'optional': true,
	},
	'name_sort': {
		'type': String,
		'optional': true,
		'autoValue': function() {
			var name = this.field('name');

			if (name.isSet) {
					return name.value.toLowerCase();
			} else {
					this.unset(); 
			}
		}
	},
	'number_of_rows': {
		'type': Number,
		'label': 'Number of rows',
		'max': 1000,
		'optional': true,
	},
	'number_of_tablets': {
		'type': Number,
		'label': 'Number of rows',
		'max': 1000,
		'optional': true,
	},
	'orientation': {
		'type': String,
		'label': 'Orientation',
		'max': 10000,
		'optional': true,
	},
	'pattern_edited_at': {
		'type': Number,
		'label': 'Edited at',
		'optional': true,
	},
	'position_of_A': {
		'type': String,
		'label': 'Position of A',
		'optional': true,
	},
	'preview_rotation': {
		'type': String,
		'label': 'Preview rotation',
		'optional': true,
	},
	'private': {
		'type': Boolean,
		'label': 'Private',
		'optional': true,
	},
	'simulation_mode': {
		'type': String,
		'label': 'Simulation mode',
		'optional': true,
	},
	'special_styles': {
		'type': String,
		'label': 'Styles',
		'max': 10000,
		'optional': true,
	},
	'styles': {
		'type': String,
		'label': 'Styles',
		'max': 10000,
		'optional': true,
	},
	'tags': {
		'type': String,
		'label': 'Tags',
		'max': 10000,
		'optional': true,
	},
	'text_edited_at': {
		'type': Number,
		'label': 'Edited at',
		'optional': true,
	},
	'threading': {
		'type': String,
		'label': 'Threading',
		'max': 10000,
		'optional': true,
	},
	'threading_notes': {
		'type': String,
		'label': 'Threading notes',
		'optional': true,
	},
	'twill_change_chart': {
		'type': String,
		'label': 'Twill direction change chart',
		'max': 10000,
		'optional': true,
	},
	'twill_direction': {
		'type': String,
		'label': 'Twill direction',
		'optional': true,
	},
	'twill_pattern_chart': {
		'type': String,
		'label': 'Twill pattern chart',
		'max': 10000,
		'optional': true,
	},
	'weaving_start_row': {
		'type': Number,
		'label': 'Weaving start row',
		'optional': true,
	},
	'weaving': {
		'type': String,
		'label': 'Weaving',
		'max': 20000,
		'optional': true,
	},
	'weaving_notes': {
		'type': String,
		'label': 'Weaving notes',
		'optional': true,
	},
	'weft_color': {
		'type': String,
		'label': 'Weft color',
		'optional': true,
	},
});

Patterns = new Meteor.Collection('patterns');

if (Meteor.isServer) {
	// ensure there is are indexes to speed up queries
	// Patterns (patterns by owner, by private)
	Patterns.rawCollection().createIndex( {'created_by': 1} );
	Patterns.rawCollection().createIndex( {'name_sort': 1} );
	Patterns.rawCollection().createIndex( {'number_of_tablets': 1} );
	Patterns.rawCollection().createIndex( {'private': 1} );

	// New Patterns (patterns by creation date, newest first)
	Patterns.rawCollection().createIndex( {'created_at': -1} );
}

Patterns.attachSchema(Schema);
