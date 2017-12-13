// keep track of user interactions that may indicate attacks
// e.g. repeated actions faster than the UI would allow, indicating scripted actions
// these actions are recorded per user

ActionsLog = new Meteor.Collection('actions_log');

var Schema = new SimpleSchema({
  user_id: {
      type: String,
      label: "User id"
  },
  username: {
      type: String,
      label: "Username"
  },
  locked: {
    type: Boolean,
    label: "Locked",
    optional: true
  },
  verification_email_sent: {
      type: [Number],
      label: "Verification email sent"
  },
  image_uploaded: {
      type: [Number],
      label: "Image uploaded"
  },
  image_removed: {
      type: [Number],
      label: "Image removed"
  },

});

ActionsLog.attachSchema(Schema);
