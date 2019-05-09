Meteor.startup(function () {
  Patterns.rawCollection().createIndex({ private: 1, name_sort: 1 });

  process.env.MAIL_URL = Meteor.settings['private'].MAIL_URL;
  process.env.ROOT_URL = Meteor.settings['private'].ROOT_URL;

  // Accounts
  Accounts.config({
    sendVerificationEmail: true 
  });

  Accounts.emailTemplates.siteName = "Twisted Threads";
  Accounts.emailTemplates.from = "Twisted Threads <no-reply@twistedthreads.org>";
  Accounts.emailTemplates.verifyEmail.subject = function (user) {
      return "Verify your email address";
  };
  Accounts.emailTemplates.verifyEmail.text = function (user, url) {
     return "Hello " + user.username
       + ",\n\nYou have registered a new email address on Twisted Threads, the online app for tablet weaving. To verify your email address, please click the link below:\n\n"
       + url;
  };

  // make sure the current user has correct role based on whether their email address is verified
  Meteor.users.find().observeChanges({
    changed: function(id, fields) {
      Meteor.call('update_user_roles', id);
    }
  });

  ///////////////////////////////
  // Ongoing database updates
  // run this as desired
  // make private all patterns with the default name
  /*Patterns.find().forEach( function(myDoc) {
    if (myDoc.name == Meteor.my_params.default_pattern_name)
      Patterns.update({_id: myDoc._id}, { $set: {private: true}});
  });*/

  // remove all patterns because something has gone wrong
  /*Patterns.find().forEach( function(myDoc) {
    //if (myDoc.name == Meteor.my_params.default_pattern_name)

    Patterns.remove(myDoc._id);
  });*/
});

Accounts.onCreateUser(function(options, user) {
  // We still want the default hook's 'profile' behavior.
  user.profile = options.profile || {};
  user.profile.name_sort = user.username.toLowerCase();
  return user;
});

