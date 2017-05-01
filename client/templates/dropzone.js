Template.dropzone.helpers({
  uploading: function () {
    return uploading.get();
  }
});

Template.dropzone.events({
  'dropped #dropzone': function(e, test) {
    e.preventDefault();

    var pattern_id = Router.current().params._id;
    var file = e.originalEvent.dataTransfer.files[0]; // This is the key difference from using raix:ui-dropped-event with CollectionFS: this line gets the first file directly so you can then pass it to Slingshot
    Session.set('upload_status', 'not started');
    Meteor.my_functions.upload_pattern_image(file, pattern_id);
  }
});

