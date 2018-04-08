// Publish pattern data, checking that the user has permission to view the pattern
Meteor.publish('patterns', function(params){
// with fastrender, params are passed in as an object.

  // there is a subscription that passes in [] as params and I can't find where it is called. The current version of Match avoids error when this empty array is passed in, and everything seems to work. The issue occurs at first load or page refresh, not on navigating routes.
  check(params, Match.Optional(Match.OneOf(Object, [String])));

// if (typeof params !== "undefined") console.log(`i ${params.i}`); // test rate limit DO NOT SHIP THIS

  // fastrender causes the production server to show "incomplete response from application" error. A workaround is to modify the core package minifier.js to reserve keywords
  // https://github.com/abecks/meteor-fast-render/issues/2

  // update: meteor --production --settings settings.json should simulate the minification locally where the server output can be viewed. However the app does not crash, it just generates the same Match failure in publish.js.

  // by default return all patterns the current user can see
  var single_user = false;
  var single_pattern = false;

  if (typeof params !== "undefined")
  {
    if (typeof params._id === "string")
      single_user = true; // return only those patterns created by this user

    if (typeof params.pattern_id === "string")
      single_pattern = true;
  }

  if (single_user) // all visible patterns created by a user
    return Patterns.find({
      $and: [
        { private: {$ne: true} },
        { created_by: params._id }
      ]
    });

  else if (single_pattern) // view pattern
    return Patterns.find({
      $and: [
        {_id: params.pattern_id},
        { $or: [
          { private: {$ne: true} },
          { created_by: this.userId }
        ]}
      ]
    });

  else // all patterns visible to this user
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

// Rate limit subscriptions
const patternsPublication = {
    type: 'subscription',
    name: 'patterns',
};

// DDPRateLimiter.addRule(patternsPublication, 1, 100);

const tagsPublication = {
    type: 'subscription',
    name: 'tags',
};

// DDPRateLimiter.addRule(tagsPublication, 1, 100);

const recent_patternsPublication = {
    type: 'subscription',
    name: 'recent_patterns',
};

// DDPRateLimiter.addRule(recent_patternsPublication, 1, 100);

const user_infoPublication = {
    type: 'subscription',
    name: 'user_info',
};

// DDPRateLimiter.addRule(user_infoPublication, 1, 100);

const actions_logPublication = {
    type: 'subscription',
    name: 'actions_log',
};

// DDPRateLimiter.addRule(actions_logPublication, 1, 100);
