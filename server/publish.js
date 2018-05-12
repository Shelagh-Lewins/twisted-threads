 Meteor.publish('patterns', function(){
  // with fastrender, params are passed in as an object.

  // there is a subscription that passes in [] as params and I can't find where it is called. The current version of Match avoids error when this empty array is passed in, and everything seems to work. The issue occurs at first load or page refresh, not on navigating routes.

  // if (typeof params !== "undefined") console.log(`i ${params.i}`); // test rate limit DO NOT SHIP THIS

  // fastrender causes the production server to show "incomplete response from application" error. A workaround is to modify the core package minifier.js to reserve keywords
  // https://github.com/abecks/meteor-fast-render/issues/2

  // update: meteor --production --settings settings.json should simulate the minification locally where the server output can be viewed. However the app does not crash, it just generates the same Match failure in publish.js.

  return Patterns.find(
    {$or: [
      { private: {$ne: true} },
      { created_by: this.userId }
    ]} // to keep queries quick, use findOne in the client
  );
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

Meteor.publish('recent_patterns', function(params, trigger){
  // return details of patterns the user has viewed / woven
  // check the pattern is viewable by this user
  check(params, Object);
  check(trigger, Match.Optional(Number));

  return Recent_Patterns.find({});

  limit = params.limit;

  var my_patterns = Patterns.find(
    {
      $or: [
        { private: {$ne: true} },
        { created_by: this.userId }
      ]
    },
    {
      limit: limit,
      sort: {"accessed_at": -1}
    },
  ).map(function(pattern) {return pattern._id});

  return Recent_Patterns.find({ $and: [{pattern_id: {$in:my_patterns}}, {user_id: this.userId}]});
});

Meteor.publish('user_info', function(params, trigger){
  // show the current user and any users who have public patterns
  check(params, Object);
  check(trigger, Match.Optional(Number));

  limit = params.limit;

  // the user's emails will be returned but for other users, only public information should be shown.
  var update = {};
  update["profile.public_patterns_count"] = {$gt: 0}; // this construction is required to query a child property

  return Meteor.users.find(
    {$or: [update, {_id: this.userId}]},
    {fields: {_id: 1, username: 1, profile: 1}},
    {
      limit: limit,
      sort: {"profile.name_sort": 1}
    }
  );
});

// Debug only - show log of user actions
// to access this, subscribe in the client with:
// Meteor.subscribe('actions_log')
Meteor.publish('actions_log', function() {
  if (!Meteor.settings.private.debug)
    return;

  return ActionsLog.find();
});
