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

    return Math.floor(Math.min(max_width, this.width));
    
  },
  scaled_height: function(role) {
    var max_height = 150;

    if (role == "preview")
      var max_height = 200;

    return Math.floor(Math.min(max_height, this.height * 600/this.width));
  },
  full_image_width: function() {
    //var container_width = $(window.document).width() * 0.95; // 95% max width of wrapper is set in image.css
    //var container_height = $(window.document).height() * 0.95; // 95% max height of wrapper is set in image.css

    return Meteor.my_functions.full_image_dimensions(this.width, this.height).width;
  },
  full_image_height: function() {
    return Meteor.my_functions.full_image_dimensions(this.width, this.height).height;
  }
});

Template.image.events({
  'click .image_holder': function(event) {
    $(event.currentTarget).addClass("full-size");
  },
  'click .close': function(event) {
    event.stopPropagation();
    event.preventDefault();

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
  }
});
