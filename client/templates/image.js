Template.image.helpers({
  created_at: function() {
    return moment(this.created_at).format('MMMM Do YYYY, h:mm:ss a');
  },
  own_image: function() {
    return (this.created_by == Meteor.userId());
  },
  scaled_width: function(role) {
    var max_width = 150;

    if (role == "preview")
      var max_width = 600;

    return Math.min(max_width, this.width);
    
  },
  scaled_height: function(role) {
    var max_height = 150;
    
    if (role == "preview")
      var max_height = 200;

    return Math.min(max_height, this.height * this.width/600);
  }
});

Template.image.events({
  'click .image_holder': function(event) {
    //console.log("full");
    $(event.currentTarget).addClass("full-size");
  },
  'click .close': function(event) {
    event.stopPropagation();
    event.preventDefault();
    //console.log("close");
    $(event.currentTarget).parent().parent().removeClass("full-size");
  },
  'click .delete_image': function(event) {
    event.stopPropagation();event.preventDefault();


    var sure = confirm('Are you sure you want to delete this image?');
    if (sure === true) {
      Meteor.call("remove_image", this._id);
    }
  },
  'click .make_preview': function(event) {
    event.stopPropagation();
    event.preventDefault();

    Meteor.call("make_preview", this._id);
  },
  'load img': function(event, template){
    //console.log("loaded image");
    //Meteor.call('set_image_dimensions', this._id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
  }
});
