Patterns = new Meteor.Collection('patterns');

var Schema = new SimpleSchema({
  created_at: {
      type: Number,
      label: "Created at"
  },
  created_by: {
      type: String,
      label: "Created by"
  },
  created_by_username: {
      type: String,
      label: "Created by username"
  },
  description: {
      type: String,
      label: "Description",
      optional: true
  },
  name: {
      type: String,
      label: "Name",
      max: 200
  },
  hole_handedness: {
      type: String,
      label: "Hole handedness",
      max: 50,
      optional: true
  },
  name_sort: {
      type: String,
      optional: true,
      autoValue: function() {
          var name = this.field("name");

          if (name.isSet) {
              return name.value.toLowerCase();
          } else {
              this.unset(); 
          }
      }
  },
  number_of_rows: {
      type: Number,
      label: "Number of rows",
      max: 1000,
      optional: true
  },
  number_of_tablets: {
      type: Number,
      label: "Number of rows",
      max: 1000,
      optional: true
  },
  orientation: {
      type: String,
      label: "Orientation",
      max: 10000,
      optional: true
  },
  pattern_edited_at: {
    type: Number,
    label: "Edited at",
    optional: true
  },
  private: {
      type: Boolean,
      label: "Private",
      optional: true
  },
  special_styles: {
      type: String,
      label: "Styles",
      max: 10000,
      optional: true
  },
  styles: {
      type: String,
      label: "Styles",
      max: 10000,
      optional: true
  },
  tags: {
      type: String,
      label: "Tags",
      max: 10000,
      optional: true
  },
  text_edited_at: {
    type: Number,
    label: "Edited at",
    optional: true
  },
  threading: {
      type: String,
      label: "Threading",
      max: 10000,
      optional: true
  },
  threading_notes: {
      type: String,
      label: "Threading notes",
      optional: true
  },
  thumbnail_url: {
      type: String,
      label: "Thumbnail URL",
      max: 500,
      optional: true
  },
  weaving: {
      type: String,
      label: "Weaving",
      max: 10000,
      optional: true
  },
  weaving_notes: {
      type: String,
      label: "Weaving notes",
      optional: true
  }
});

Patterns.attachSchema(Schema);



