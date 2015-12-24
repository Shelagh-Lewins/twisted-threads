// Publish pattern data, checking that the user has permission to view the pattern
Meteor.publish('patterns', function(created_by){
  check(created_by, Match.Optional(String));

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
