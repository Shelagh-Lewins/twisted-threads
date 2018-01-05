// Publish pattern data, checking that the user has permission to view the pattern
Meteor.publish('patterns', function(created_by){
  check(created_by, Match.Optional(String)); // fastrender causes this check to fail by passing in an empty object on page refresh. This seems to be the cause of app crashing on server and causing "incomplete response from application" error. A workaround is to modify the core package minifier.js
  // https://github.com/abecks/meteor-fast-render/issues/2
  // it is not clear why, but the check seems to be necessary to avoid crashes on the production server.

  if (typeof created_by === "string")
    return Patterns.find({
      $and: [
        { private: {$ne: true} },
        { created_by: created_by }
      ]
    });

  else
    return Patterns.find({
      $or: [
        { private: {$ne: true} },
        { created_by: this.userId }
      ]
    });
});

// Publish images uploaded by the user
Meteor.publish('images', function() {
  return Images.find();
});

Meteor.publish('tags', function(){
  // The collection is readonly and all tags should be public
  return Meteor.tags.find();
});

// trigger is there to force a resubscription when pattern ids or private have changed, otherwise Meteor is "smart" and doesn't run it.

//Meteor.publish('recent_patterns', function(){
  Meteor.publish('recent_patterns', function(trigger){
  // return details of patterns the user has viewed / woven
  // check the pattern is viewable by this user
  // trigger is there to force a resubscription when pattern ids or private have changed, otherwise Meteor is "smart" and doesn't run it.
  check(trigger, Match.Optional(Number));

  var my_patterns = Patterns.find({
    $or: [
      { private: {$ne: true} },
      { created_by: this.userId }
    ]
  }).map(function(pattern) {return pattern._id});

  return Recent_Patterns.find({ $and: [{pattern_id: {$in:my_patterns}}, {user_id: this.userId}]});
});

Meteor.publish('user_info', function(trigger){
  // show only the current user and any users who have public patterns

  check(trigger, Match.Optional(Number));

  var my_patterns = Patterns.find({
    private: {$ne: true}
  }).map(function(pattern) {return pattern.created_by});

  // the user's emails will be returned but for other users, only public information should be shown.
  return Meteor.users.find({ $or: [{_id: {$in:my_patterns}}, {_id: this.userId}]}, {fields: {_id: 1, username: 1, profile: 1}});
});

// Debug only - show log of user actions
// to access this, subscribe in the client with:
// Meteor.subscribe('actions_log')
Meteor.publish('actions_log', function() {

  if (!Meteor.settings.private.debug)
      return;

  return ActionsLog.find();
});


