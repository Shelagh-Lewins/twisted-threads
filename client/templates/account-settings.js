Template.account_settings.rendered = function() {
  $('body').attr("class", "account_settings");
  Meteor.my_functions.initialize_route();
};

Template.account_settings.events({
  'click .send_verification_email': function(event, template){
    if (!Meteor.user().emails[0].verified)
    {
      Meteor.call('sendVerificationEmail', Meteor.userId(), Meteor.user().emails[0].address);
    }
  }
});
