Meteor.startup(function () {

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
