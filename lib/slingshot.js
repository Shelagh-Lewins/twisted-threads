// slingshot image uploader
// puts files in an AWS (Amazon Web Services) bucket

if (Meteor.isClient) {
  uploader = new ReactiveVar();

  var currentUserId = Meteor.userId();
  Session.set('upload_status', 'not started');

  Template.image_uploader.events({'change .uploadFile': function(event, template){
      event.preventDefault();
      var pattern_id = Router.current().params._id;
      var file = document.getElementById('uploadFile').files[0];
      
      Meteor.my_functions.upload_pattern_image(file, pattern_id);
    }
  });

  Meteor.subscribe('images');
}

if (Meteor.isServer) {
  Slingshot.fileRestrictions("myImageUploads", {
    allowedFileTypes: ["image/png", "image/jpeg", "image/gif"],
    maxSize: 2 * 1024 * 1024,
  });

  Slingshot.createDirective("myImageUploads", Slingshot.S3Storage, {
    AWSAccessKeyId: Meteor.settings.private.AWSAccessKeyId,
    AWSSecretAccessKey: Meteor.settings.private.AWSSecretAccessKey,
    bucket: Meteor.settings.private.AWSBucket,
    acl: "public-read",
    region: Meteor.settings.public.AWSRegion,

    authorize: function (file, context) {
      
      // User must be logged in
      if (!this.userId) {
        var message = "You are not logged in.";
        throw new Meteor.Error("not-authorized", message);
      }

      // User must have verified their email address
      var user = Meteor.users.findOne({_id: this.userId}, { fields: {emails: 1}});
      if (!user.emails[0].verified) {
        var message = "Your email address is not verified.";
        throw new Meteor.Error("not-authorized", message);
      }

      // User must own the pattern
      var pattern = Patterns.findOne({_id: context.pattern_id}, { fields: {created_by: 1}});
      if (pattern.created_by != this.userId)
      {
        var message = "You did not create this pattern.";
        throw new Meteor.Error("not-authorized", message);
      }

      return true;
    },

    key: function (file) {
      var parts = file.name.split("."); // find the file extension
      var extension = parts.pop();
      var name = parts.join(""); // find the name
      var name = name.slice(0,30) + "-" + moment().valueOf().toString() + "." + extension; // use the first 30 chars of the name, plus timestamp, plus file extension, to make a meaningful name that is unique to this user
      return Meteor.userId() + "/" + name;
    },
  });
}
