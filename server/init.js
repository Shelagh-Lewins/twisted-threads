Meteor.startup(function () {

  // Accounts
  Accounts.config({
    sendVerificationEmail: true 
  });

  Accounts.emailTemplates.siteName = "Twisted Threads";
  Accounts.emailTemplates.from = "Twisted Threads <no-reply@twisted-threads.com>";
  Accounts.emailTemplates.verifyEmail.subject = function (user) {
      return "Verify your email address";
  };
  Accounts.emailTemplates.verifyEmail.text = function (user, url) {
     return "Hello " + user.username
       + ",\n\nYou have registered a new email address on Twisted Threads, the online app for tablet weaving. To verify your email address, please click the link below:\n\n"
       + url;
  };

  // data migration to remove thumbnail_url
 /* Patterns.find().forEach( function(myDoc) {
    Patterns.update({_id: myDoc._id}, {$unset: { thumbnail_url: "text"}});
  });*/
  // after running this, remove thumbnail_url from schema
 
  ///////////////////////////////
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
