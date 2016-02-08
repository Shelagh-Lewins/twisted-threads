Images = new Meteor.Collection ('images');

var Schema = new SimpleSchema({
  url: {
    type: String,
    label: "URL"
  },
  key: {
    type: String,
    label: "Key"
  },
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
  used_by: {
    type: String, // e.g. pattern_id, user_id
    label: "Used by"
  },
  role: {
    type: String, // e.g. preview, avatar
    label: "Role"
  },
  width: {
      type: Number,
      label: "Width",
      optional: true
  },
  height: {
      type: Number,
      label: "Height",
      optional: true
  }
});

Images.attachSchema(Schema);
