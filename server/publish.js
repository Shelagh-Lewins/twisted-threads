  // with fastrender, params are passed in as an object.

  // there is a subscription that passes in [] as params and I can't find where it is called. The current version of Match avoids error when this empty array is passed in, and everything seems to work. The issue occurs at first load or page refresh, not on navigating routes.

  // if (typeof params !== "undefined") console.log(`i ${params.i}`); // test rate limit DO NOT SHIP THIS

  // fastrender causes the production server to show "incomplete response from application" error. A workaround is to modify the core package minifier.js to reserve keywords
  // https://github.com/abecks/meteor-fast-render/issues/2

  // update: meteor --production --settings settings.json should simulate the minification locally where the server output can be viewed. However the app does not crash, it just generates the same Match failure in publish.js.

// Data for search
Meteor.publish('search_patterns', function(){

  fields = {
    _id: 1,
    created_by_username: 1,
    name: 1,
    name_sort: 1,
    number_of_tablets: 1,
    tags: 1,
  }

  if (this.userId)
    return Patterns.find(
      {
        $or: [
          { private: {$ne: true} },
          { created_by: this.userId },
        ]
      },
      {
        fields: fields,
      }
    );
  else
    return Patterns.find(
      { private: {$ne: true} },
      {
        fields: fields,
      }
    );
});

Meteor.publish('search_users', function(){

  var update = {};
  update["profile.public_patterns_count"] = {$gt: 0}; // this construction is required to query a child property

  if (this.userId)
    return Meteor.users.find(
      {$or: [update, {_id: this.userId}]},
      {fields: {
        _id: 1,
        profile: 1,
        username: 1,
      }},
    );
  else
    return Meteor.users.find(
      {$or: [update]},
      {fields: {
        _id: 1,
        profile: 1,
        username: 1,
      }},
    );
});

// Single pattern
Meteor.publish('pattern', function(params){
  check(params, Object);
  check(params.pattern_id, String);

  if (this.userId)
    return Patterns.find(
      { $and: 
        [
          { _id: params.pattern_id }, 
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
  else
    return Patterns.find(
      { $and: 
        [
          { _id: params.pattern_id },
          { private: {$ne: true} },
        ]
      },
      {
        limit: 1
      }
    );
});

// Recent Patterns for Home page
Meteor.publish('recent_patterns', function(params){
  check(params, Object);

  var pattern_ids = typeof params.pattern_ids === "undefined" ? [] : params.pattern_ids;

  var fields = {
    _id: 1,
    auto_preview: 1,
    created_at: 1,
    created_by: 1,
    created_by_username: 1,
    description: 1,
    name: 1,
    name_sort: 1,
    number_of_tablets: 1,
    private: 1,
  }

  if (this.userId)
    return Patterns.find(
      { $and: 
        [
          { _id: {$in:params.pattern_ids}}, 
          { $or: [
            { private: {$ne: true} },
            { created_by: this.userId }
          ]}
        ]
      },
      {
        limit: Meteor.my_params.max_recents,
        fields: fields,
      }
    );
  else
    return Patterns.find(
      { $and: 
        [
          { _id: {$in:params.pattern_ids}}, 
          { private: {$ne: true}},
        ]
      },
      {
        limit: Meteor.my_params.max_recents,
        fields: fields,
      }
    );
});

// New Patterns for Home page
Meteor.publish('new_patterns', function(){
  var fields = {
    _id: 1,
    auto_preview: 1,
    created_at: 1,
    created_by: 1,
    created_by_username: 1,
    description: 1,
    name: 1,
    name_sort: 1,
    number_of_tablets: 1,
    private: 1,
  }

  if (this.userId)
    return Patterns.find(
      {
        $or: [
          { private: {$ne: true} },
          { created_by: this.userId },
        ]
      },
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {created_at: -1},
        fields: fields,
      }
    );
  else
    return Patterns.find(
      { private: {$ne: true} },
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {created_at: -1},
        fields: fields,
      }
    );
});

// My Patterns for Home page
Meteor.publish('my_patterns', function(){

  var fields = {
    _id: 1,
    auto_preview: 1,
    created_at: 1,
    created_by: 1,
    created_by_username: 1,
    description: 1,
    name: 1,
    name_sort: 1,
    number_of_tablets: 1,
    private: 1,
  }

  if (this.userId)
    return Patterns.find(
      { created_by: this.userId },
        {
          limit: Meteor.my_params.max_home_thumbnails,
          sort: {name_sort: 1},
          fields: fields
        }
      );
  else
    return [];

});

// All Patterns for Home page
Meteor.publish('all_patterns', function(){

  var fields = {
    _id: 1,
    auto_preview: 1,
    created_at: 1,
    created_by: 1,
    created_by_username: 1,
    description: 1,
    name: 1,
    name_sort: 1,
    number_of_tablets: 1,
    private: 1,
  }

  if (this.userId)
    return Patterns.find(
      {
        $or: [
          { private: {$ne: true} },
          { created_by: this.userId },
        ]
      },
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {name_sort: 1},
        fields: fields,
      }
    );
  else
    return Patterns.find(
      { private: {$ne: true} },
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {name_sort: 1},
        fields: fields,
      }
    );
});

// Single user
Meteor.publish('user', function(params){
  check(params, Object);
  check(params.user_id, String);

  // the user's emails will be returned but for other users, only public information should be shown.
  var update = {};
  update["profile.public_patterns_count"] = {$gt: 0}; // this construction is required to query a child property
  update["id"] = params.user_id;

  return Meteor.users.find(
    {$or: [update, {_id: this.userId}]},
    {
      limit: 1,
      sort: {"profile.name_sort": 1},
      fields: {_id: 1, username: 1, profile: 1},
    },
  );
}); 

// Users for Home page
Meteor.publish('users_home', function(trigger){

  // show the current user and any users who have public patterns
  check(trigger, Match.Optional(Number));

  // the user's emails will be returned but for other users, only public information should be shown.
  var update = {};
  update["profile.public_patterns_count"] = {$gt: 0}; // this construction is required to query a child property

  if (this.userId)
    return Meteor.users.find(
      {$or: [update, {_id: this.userId}]},
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {"profile.name_sort": 1},
        fields: {_id: 1, username: 1, profile: 1},
      }
    );
  else
    return Meteor.users.find(
      {$or: [update]},
      {
        limit: Meteor.my_params.max_home_thumbnails,
        sort: {"profile.name_sort": 1},
        fields: {_id: 1, username: 1, profile: 1},
      }
    );
});

// Publish images uploaded by the user
Meteor.publish('images', function(params) {
  return Images.find();
});

Meteor.publish('tags', function(){
  // The collection is readonly and all tags should be public
  return Meteor.tags.find();
});

// Debug only - show log of user actions
// to access this, subscribe in the client with:
// Meteor.subscribe('actions_log')
Meteor.publish('actions_log', function() {
  if (!Meteor.settings.private.debug)
    return;

  return ActionsLog.find();
});
