 Meteor.publish('patterns', function(params){
  check(params, Object);

  var limit = params.limit;

  return Patterns.find(
    {$or: [
      { private: {$ne: true} },
      { created_by: this.userId }
    ]},
    {
      limit: limit,
    }
  );
}); 

// Publish pattern data, checking that the user has permission to view the pattern
/* Meteor.publish('patterns', function(params){
// with fastrender, params are passed in as an object.

  // there is a subscription that passes in [] as params and I can't find where it is called. The current version of Match avoids error when this empty array is passed in, and everything seems to work. The issue occurs at first load or page refresh, not on navigating routes.
  check(params, Object);

// if (typeof params !== "undefined") console.log(`i ${params.i}`); // test rate limit DO NOT SHIP THIS

  // fastrender causes the production server to show "incomplete response from application" error. A workaround is to modify the core package minifier.js to reserve keywords
  // https://github.com/abecks/meteor-fast-render/issues/2

  // update: meteor --production --settings settings.json should simulate the minification locally where the server output can be viewed. However the app does not crash, it just generates the same Match failure in publish.js.

  // by default return all patterns the current user can see
  var single_user = false;
  var single_pattern = false;
  limit = params.limit;

  if (typeof params !== "undefined")
  {
    if (typeof params._id === "string")
      single_user = true; // return only those patterns created by this user

    if (typeof params.pattern_id === "string")
      single_pattern = true;
  }

  console.log(`single user ${single_user}`);

  if (single_user) // all visible patterns created by a user
    if (params._id === this.userId)
    {
      console.log("my patterns");
    // the user's own patterns: show all
      return Patterns.find(
        {
          created_by: params._id,
        },
        {
          limit: limit,
          sort: {"name": 1},
        }
      );
    }
    else
    {
      console.log("your patterns");
      // another user's patterns: only show public
      return Patterns.find(
        {
          $and: [
            { private: {$ne: true} },
            { created_by: params._id }
          ]
        },
        {
          limit: limit,
          sort: {"name": 1},
        }
      );
    }

  else if (single_pattern) // view pattern
    return Patterns.find(
      {
        $and: [
          {_id: params.pattern_id},
          { $or: [
            { private: {$ne: true} },
            { created_by: this.userId }
          ]}
        ]
      },
      {
        limit: 1
      }
    );

  else // all patterns visible to this user
    return Patterns.find(
      {$or: [
        { private: {$ne: true} },
        { created_by: this.userId }
      ]},
      {
        limit: limit,
        sort: {"name": 1},
      }
    );
}); */

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
