/////////////////////////////
// Users collection

this.Users = new Meteor.Pagination(Meteor.users, {
  itemTemplate: "user_thumbnail",
  templateName: "users",
  perPage: 12,
  availableSettings: {
    filters: true,
    sort: true
  },
  auth: function(skip, sub){
    var userSettings = this.userSettings[sub._session.id] || {};
    var userFilters = userSettings.filters || {};

    var update = {};
    update["profile.public_patterns_count"] = {$gt: 0}; // this construction is required to query a child property

    if (sub.userId)
      var _filters = _.extend(
        { $or: [update, {_id: sub.userId}]}, userFilters); // Only return users with published patterns, and the user themself
    else
      var _filters = _.extend(
        { $or: [update]}, userFilters); // Only return users with published patterns, and the user themself

    var _options = {
      limit: 12,
      skip: skip,
      fields: { username: 1 } // if no fields are set, ALL user fields are published, including sensitive ones. Setting even one field seems to ensure only 'public' fields like profile are published.
    }
    if (typeof userSettings.sort === "object") 
      _options.sort = userSettings.sort;
    else
    {
      _options.sort = { 'profile.name_sort': 1}; // lower-case version of username
    }
    
    return [_filters, _options];
  }
});

// Deny all client-side updates to user documents
// Otherwise the user can write to their profile from the client
Meteor.users.deny({
  update() { return true; }
});

/////////////////////////////
// tags on patterns
Tags.TagsMixin(Patterns); // https://atmospherejs.com/patrickleet/tags
Patterns.allowTags(function (userId) { return true; });

// search patterns
patternsIndex = new EasySearch.Index({
  collection: Patterns,
  fields: ['name_sort', 'tags', 'created_by_username', 'number_of_tablets'],
  defaultSearchOptions: {
    limit: 6
  },
  engine: new EasySearch.Minimongo() // search only on the client, so only published documents are returned

  // server side searches
  /*engine: new EasySearch.MongoDB({
    selector: function (searchObject, options, aggregation) {
      let selector = this.defaultConfiguration().selector(searchObject, options, aggregation);

      selector.createdBy = options.userId;
      console.log("searchObject " + Object.keys(searchObject));
      console.log("aggregation " + Object.keys(aggregation));
      console.log("id " + options.search.userId);

      return selector;
    }
  })*/
});

usersIndex = new EasySearch.Index({
  collection: Meteor.users,
  fields: ['username', 'profile.description'],
  defaultSearchOptions: {
    limit: 6
  },
  engine: new EasySearch.Minimongo() // search only on the client, so only published documents are returned
});

////////////////////////////
// Pagination
// https://github.com/alethes/meteor-pages
// note that requestPage(1) is called when each template is rendered
// https://github.com/alethes/meteor-pages/issues/208

// show all patterns belonging to one user
this.UserPatterns = new Meteor.Pagination(Patterns, {
  itemTemplate: "pattern_thumbnail",
  templateName: "user",
  perPage: 12,
  availableSettings: {
    filters: true,
    sort: true
  },
  auth: function(skip, sub){
    var userSettings = this.userSettings[sub._session.id] || {};
    var userFilters = userSettings.filters || {};
    
    if (sub.userId)
      var _filters = _.extend({
        $or: [
          { private: {$ne: true} },
          { created_by: sub.userId }
        ]
      }, userFilters);
    else
      var _filters = _.extend(
        { private: {$ne: true} },
        userFilters);

    var _options = {
      limit: 12,
      sort: { name_sort: 1},
      skip: skip,
      fields: {
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
    }
    
    return [_filters, _options];
  }
});

this.MyPatterns = new Meteor.Pagination(Patterns, {
  itemTemplate: "pattern_thumbnail",
  templateName: "my_patterns",
  perPage: 12,
  availableSettings: {
    filters: true,
    sort: true
  },
  auth: function(skip, sub){
    var userSettings = this.userSettings[sub._session.id] || {};
    var userFilters = userSettings.filters || {};
    var _filters = _.extend({created_by: sub.userId}, userFilters);

    var _options = {
      limit: 12,
      sort: { name_sort: 1},
      skip: skip,
      fields: {
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
    }
    
    return [_filters, _options];
  },
  filters: {}
});

this.AllPatterns = new Meteor.Pagination(Patterns, {
  itemTemplate: "pattern_thumbnail",
  templateName: "all_patterns",
  perPage: 12, /* required, otherwise pages do not show consistent number of documents */
  availableSettings: {
    filters: true,
    sort: true
  },
  auth: function(skip, sub){
    var userSettings = this.userSettings[sub._session.id] || {};
    var userFilters = userSettings.filters || {}; /* apply client-side filters if set */

    if (sub.userId)
      var _filters = _.extend({ /* whatever you allow here is allowed everywhere - including by your own publish functions */
        $or: [
          { private: {$ne: true} },
          { created_by: sub.userId }
        ]
      }, userFilters);
    else
      var _filters = _.extend( /* whatever you allow here is allowed everywhere - including by your own publish functions */
        { private: {$ne: true} },
        userFilters);

    var _options = {
      limit: 12, /* replaces perPage */
      skip: skip, /* skip is required, otherwise pages > 1 show nothing */
      fields: {
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
    }
    if (typeof userSettings.sort === "object") /* if client-side sort */
      _options.sort = userSettings.sort;
    else
      _options.sort = { name_sort: 1};
    
    return [_filters, _options];
  },
  filters: {}
});

this.NewPatterns = new Meteor.Pagination(Patterns, {
  itemTemplate: "pattern_thumbnail",
  templateName: "new_patterns",
  perPage: 12,
  availableSettings: {
    filters: true,
    sort: true
  },
  auth: function(skip, sub){
    var userSettings = this.userSettings[sub._session.id] || {};
    var userFilters = userSettings.filters || {};

    if (sub.userId)
      var _filters = _.extend({
        $or: [
          { private: {$ne: true} },
          { created_by: sub.userId }
        ]
      }, userFilters);
    else
      var _filters = _.extend(
      { private: {$ne: true} },
      userFilters);

    var _options = {
      limit: 12,
      sort: { created_at: -1},
      skip: skip,
      fields: {
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
    }
    
    return [_filters, _options];
  },
  filters: {}
});
