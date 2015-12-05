Meteor.startup(function () {
  ////////////////////////
  // TODO remove this code after running it once on the live site
  // fixes my mistake with user profiles
  // http://stackoverflow.com/questions/12956438/accessing-mongodb-collection-values-in-javascript
  /*Meteor.users.find().forEach(function(user){
    number = Patterns.find({created_by: user._id}).count();

    if (typeof user.profile === "string")
    {
      var description = user.profile;
      var profile = {};
      profile.description = description;
      Meteor.users.update({_id: user._id}, {$set: {profile: profile}});
    }
  })*/

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
});
