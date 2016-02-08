Template.image_uploader.helpers({

  isUploading: function () {
    return Boolean(uploader.get());
  },

  progress: function () {
    if (Session.equals('upload_status', 'not started'))
      return 0;
    
    var upload = uploader.get();

    if (Session.equals('upload_status', 'complete'))
    {
      return 100;
    }

    if (upload)
    {
      var progress = upload.progress();

      if (isNaN(progress))
        return 0;

      if (progress == 1)
        Session.set('upload_status', 'complete');

      return Math.round(progress * 100);
    }
    
  },

  url: function () {
    var currentUserId = Meteor.userId();
    return Images.findOne({uploadedBy: currentUserId},{sort:{ time : -1 } });
  },
});

Template.image_uploader.events({
  // Hide image uploader
  "click .close": function () {
      Session.set('show_image_uploader', false);
  }
});
