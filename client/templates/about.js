Template.about.rendered = function() {
  $('body').attr("class", "about");

 Session.set('show_contact_info', false);
 Session.set('show_email', false);
}

Template.contact_info.helpers({
  /////////////////////
  // pattern
  show_contact_info: function() {
    if (Session.equals('show_contact_info', true))
      return true;

    else
      return false;
  }
 });


Template.contact_info.events({
 'click #button': function () {
    Session.set('show_contact_info', true);
  }
});

Template.contact_info.helpers({
  isChecked: function() {
    return Session.get('show_email');
  }
 });

Template.contact_info.events({
 'change #checkbox': function (event) {
    Session.set('show_email', event.target.checked);
  }
});

