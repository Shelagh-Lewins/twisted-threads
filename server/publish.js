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

// trigger is there to force a resubscription when pattern ids or private have changed, otherwise Meteor is "smart" and doesn't run it.
Meteor.publish('weaving', function(pattern_id, trigger){
  check(pattern_id, String);
  check(trigger, Match.Optional(Number));

  if(Patterns.find( {_id: pattern_id}, {
    $or: [
          { private: {$ne: true} },
          { created_by: this.userId }
        ]
    }).count() != 0)
    return Weaving.find({ pattern_id: pattern_id });

  else
    return [];
});

Meteor.publish('threading', function(pattern_id, trigger){
  check(pattern_id, String);
  check(trigger, Match.Optional(Number));

  if(Patterns.find( {_id: pattern_id}, {
    $or: [
          { private: {$ne: true} },
          { created_by: this.userId }
        ]
    }).count() != 0)
    return Threading.find({ pattern_id: pattern_id });

  else
    return [];
});

Meteor.publish('orientation', function(pattern_id, trigger){
  check(pattern_id, String);
  check(trigger, Match.Optional(Number));

  if(Patterns.find( {_id: pattern_id}, {
    $or: [
          { private: {$ne: true} },
          { created_by: this.userId }
        ]
    }).count() != 0)
    return Orientation.find({ pattern_id: pattern_id });

  else
    return [];
});

Meteor.publish('styles', function(pattern_id, trigger){
  check(pattern_id, String);
  check(trigger, Match.Optional(Number));

  if(Patterns.find( {_id: pattern_id}, {
    $or: [
          { private: {$ne: true} },
          { created_by: this.userId }
        ]
    }).count() != 0)
    return Styles.find({ pattern_id: pattern_id });

  else
    return [];
});

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

Meteor.publish('user_info', function(user_id){
  check(user_id, String);
  return Meteor.users.find({ _id: user_id }, {fields: {_id: 1, username: 1}});
});
