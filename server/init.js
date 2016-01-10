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

  // Image upload
  /*UploadServer.init({
    tmpDir: process.env.PWD + '/.uploads/tmp',
    uploadDir: process.env.PWD + '/.uploads/',
    checkCreateDirectories: true //create the directories for you
  });*/

  // run exactly once to convert dates to numbers so they can be sorted
  // TODO recheck this on freshly downloaded database
  // upload to site
  // comment out and upload again
  /*Patterns.find().forEach( function(myDoc) {
    var new_val = moment(myDoc.created_at).valueOf();
    //console.log("***")
    //console.log("pattern " + myDoc.name);
    //console.log("old date " + myDoc.created_at);
    //console.log("new time " + new_val);
    //console.log("new as date " + moment(new_val).format());

    Patterns.update({_id: myDoc._id}, { $set: {created_at: new_val}});
  });

  Recent_Patterns.find().forEach( function(myDoc) {
    var new_val = moment(myDoc.accessed_at).valueOf();
    //console.log("***")
    //console.log("pattern " + myDoc.pattern_id);
    //console.log("old date " + myDoc.accessed_at);
    //console.log("new time " + new_val);
    //console.log("new as date " + moment(new_val).format());

    Recent_Patterns.update({_id: myDoc._id}, { $set: {accessed_at: new_val}});
  });
//console.log("number of patterns " + Patterns.find().count());

  // run exactly once to add name_sort to enable case-insensitive sorting
  // just setting the name to its current value triggers the schema to add the autovalue name_sort, which is the lower-case version of the name
  Patterns.find().forEach( function(myDoc) {
    var new_val = myDoc.name;

    Patterns.update({_id: myDoc._id}, { $set: {name: new_val}});
  });

  // run exactly once to add name_sort to users, again for case-insensitive sorting. Must add explicitly because profile may be undefined.
  Meteor.users.find().forEach( function(myDoc) {
    var name_sort = myDoc.username.toLowerCase();

    //if (typeof myDoc.profile !== "undefined")
      //console.log("profile " + name_sort);

    var profile = myDoc.profile || {};
    profile.name_sort = name_sort;

    Meteor.users.update({_id: myDoc._id}, {$set: {profile: profile}});
  });*/

  // run this as desired
  // make private all patterns with the default name
  /*Patterns.find().forEach( function(myDoc) {
    if (myDoc.name == Meteor.my_params.default_pattern_name)
      Patterns.update({_id: myDoc._id}, { $set: {private: true}});
  });*/
});

Accounts.onCreateUser(function(options, user) {
  // We still want the default hook's 'profile' behavior.
  user.profile = options.profile || {};
  user.profile.name_sort = user.username.toLowerCase();
  return user;
});
