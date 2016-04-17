// weaving cell data suitable for generating SVG elements for the auto preview

WeavingCells = new Meteor.Collection('weaving_cells');

var Schema = new SimpleSchema({
  pattern_id: {
      type: String,
      label: "User id"
  },
  row: {
    type: Number,
    label: "Row"
  },
  tablet: {
      type: Number,
      label: "Tablet"
  },
  style: {
      type: String,
      label: "Style"
  },

});

WeavingCells.attachSchema(Schema);
