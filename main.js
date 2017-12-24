if (Meteor.isClient) {
  // configure the default accounts-ui package
  
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });
  
  Session.set('window_width', $(window).width());
  Session.set('window_height', $(window).height());

  Meteor.startup(function () {

    Session.set('click_latch', false); // used to prevent double click on buttons

    Session.set("loading", false);

    window.addEventListener('resize', function(){
      Session.set('window_width', $(window).width());
      Session.set('window_height', $(window).height());
      Session.set('thumbnails_in_row', Meteor.my_functions.thumbnails_in_row());
    });

    Session.set('display_min_tablets', 1);
  });

  reactive_recent_patterns = new ReactiveArray();

  //////////////////////////////
  // Helpers for templates that may be used on multiple pages

  /* *** Loading template *** */
  Template.loading.rendered = function() {
    $('body').attr("class", "loading");
    Meteor.my_functions.initialize_route();
  }

  Template.main_layout.rendered = function() {
    // main template contains the header and width divs
     $(window).on('resize orientationchange', function(e) {
      Meteor.my_functions.resize_page();  
    });

     $("#width").on('scroll', function(e) {
      Meteor.my_functions.resize_page();  
    }); 
   }

  Template.main_layout.helpers({
    loading: function(){
      if (Session.equals('loading', true))
        return "loading";
    }
  });

  /* *** Helper functions that may be used by more than one template *** */
  // Allows a template to check whether a helper value equals a string
  UI.registerHelper('equals', function (a, b) {
    return (a === b);
  });

  UI.registerHelper('multiply', function (a, b) {
    return a*b;
  });

  // allows a template to check whether a session variable equals a value
  UI.registerHelper('session_equals', function(session_var, test_value){
    if (Session.get(session_var) == test_value)
      return true;
    else
      return false;
  });

  UI.registerHelper('is_cordova', function () {
    if(Meteor.isCordova)
      return true;
  });

  UI.registerHelper('show_editable_field', function (field_value, _id) {
    // editable field such as pattern description is shown if:
    // the user can edit the pattern, or
    // a string value exists and is not empty
    if (Meteor.my_functions.can_edit_pattern(_id))
      return true;

    return Meteor.my_functions.string_exists(field_value);
  });

  UI.registerHelper('string_exists', function (value) {
      return Meteor.my_functions.string_exists(value);
  });

  // used by connection_status template and also to apply class to div#width
  UI.registerHelper('connection_status', function () {
    /* meteor.status().status can have these values:
      connected
      connecting (disconnnected, trying to connect)
      failed (permainently failed e.g. incompatible)
      waiting (will try to reconnect)
      offline (user disconnected the connection)
    */

    // there is a 3 second delay before reporting connection lost, partly to avoid a false 'connection lost' message when the page is first loaded.

    switch (Meteor.status().status)
    {
      case "connecting":  // Fallthrough
      case "waiting":
        if (typeof connection_timeout === "undefined")
          connection_timeout = setTimeout(function(){
            Session.set("connection_status", "trying_to_connect");
          }, 3000);
        break;

      case "failed":  // Fallthrough
      case "offline":
        if (typeof disconnected_timeout === "undefined")
          disconnected_timeout = setTimeout(function(){
            Session.set("connection_status", "disconnected");
          }, 3000);
        Session.set("connection_status", "disconnected");
        break;

      case "connected":
        Session.set("connected", true);
        if (typeof connection_timeout !== "undefined")
          clearTimeout(connection_timeout);

        if (typeof disconnected_timeout !== "undefined")
          clearTimeout(disconnected_timeout);

        Session.set("connection_status", "connected");
        break;

      default:
        Session.set("connection_status", "disconnected");
        break;
    }
    return Session.get("connection_status");
  });

  UI.registerHelper('no_weaving_rows', function() {
    // cannot remove a row from pattern, and
    // cannot view interactive weaving chart because no rows woven
    // can only happen in manual simulation pattern

    // avoids error when pattern is private and user doesn't have permission to see it
    var pattern_id = Router.current().params._id;
    if (!Meteor.my_functions.pattern_exists(pattern_id))
        return "disabled";

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: { number_of_rows: 1}});

    if (pattern.number_of_rows < 1)
      return "disabled";
  });

  //////////////////////////////////
  // Used in header to display correct buttons and title depending on route and params
  // Used in menu to determine menu entries
  UI.registerHelper('route_name', function(){
    return Router.current().route.getName();
  });

  //////////////////////////////////
  // turn off / show manually activated 'Loading...' indicator
  UI.registerHelper('rendered_manual', function() {
    // call this in the template to hide "loading..."
    Session.set("loading", false);
    return true;
  });

  //////////////////////////////////
  // Simulation patterns
  UI.registerHelper('edit_mode', function() {
    if (Router.current().route.getName() == "pattern")
    {
      return Session.get("edit_mode");
    }
  });

  UI.registerHelper('simulation_mode', function() {
    if (Router.current().route.getName() == "pattern")
      return Session.get("simulation_mode");
  });

  UI.registerHelper('does_pattern_repeat', function(){
    var pattern_id = Router.current().params._id;
    return Meteor.my_functions.does_pattern_repeat(pattern_id);
  });

  Template.header.events({
    "click #home": function() {
      Session.set("loading", true);  
    }
  });

  //////////////////////////////////
  // provide lists of patterns in different categories
  // requestPage(1) works around a bug in alethes-pages introduced with the Meteor 1.3 upgrade, in which if you have more than 2 or 3 paginated objects, only the first few that were defined will work.
  // https://github.com/alethes/meteor-pages/issues/208
  Template.new_patterns.onRendered(function() {
    NewPatterns.requestPage(1);
  });

  Template.my_patterns.onRendered(function() {
    MyPatterns.requestPage(1);
  });

  Template.all_patterns.onRendered(function() {
    AllPatterns.requestPage(1);
  });

  Template.user.onRendered(function() {
    UserPatterns.requestPage(1);
  });

  UI.registerHelper('recent_patterns', function(limit){
    if (Meteor.userId()) // user is signed in
      var pattern_ids = Recent_Patterns.find({}, {sort: {accessed_at: -1}}).map(function(pattern){ return pattern.pattern_id});

    else
      var pattern_ids = Meteor.my_functions.get_local_recent_pattern_ids();

    // stored for "recent patterns" route pagination
    reactive_recent_patterns.clear();
    reactive_recent_patterns = new ReactiveArray(pattern_ids);

    // return the patterns in recency order
    var patterns = [];

    for (var i=0; i<pattern_ids.length; i++)
    {
      var id = pattern_ids[i];
      // Check for null id or non-existent pattern
      if (id == null) continue;
      if (typeof id === "undefined") continue;
      
      var pattern = Patterns.findOne({_id: id});
      if (typeof pattern === "undefined") continue;

      if (limit)
        if (i >= Session.get('thumbnails_in_row'))
          break;
      
      patterns.push(pattern);
    }

    return patterns; // Note this is an array because order is important, so in the template use .length to find number of items, not .count
  });

  UI.registerHelper('not_recent_patterns', function(limit){
    // any visible pattern that is not shown in Recent Patterns
    if (Meteor.userId()) // user is signed in
      var pattern_ids = Recent_Patterns.find().map(function(pattern){ return pattern.pattern_id});

    else
      var pattern_ids = Meteor.my_functions.get_local_recent_pattern_ids();

    var obj = {};     
    obj["sort"] = {};
    obj["sort"]["name"] = 1;

    if (limit)
      obj["limit"] = Session.get('thumbnails_in_row');
      
    return Patterns.find({_id: {$nin: pattern_ids}}, obj);
    // This is a cursor use use .count in template to find number of items
  });

  UI.registerHelper('my_patterns', function(limit){
    if (!Meteor.userId())
      return;

    var obj = {};
      
    obj["sort"] = {};
    obj["sort"]["name"] = 1;

    if (limit)
      obj["limit"] = Session.get('thumbnails_in_row');

    return Patterns.find({created_by: Meteor.userId()}, obj);
    // This is a cursor use use .count in template to find number of items
  });

  UI.registerHelper('new_patterns', function(limit){
    var obj = {};
    obj["sort"] = {};
    obj["sort"]["created_at"] = -1;

    if (limit)
      obj["limit"] = parseInt(Session.get('thumbnails_in_row'));

    return Patterns.find({}, obj);
    // This is a cursor use use .count in template to find number of items
  });

  UI.registerHelper('all_patterns', function(limit){
    var obj = {};
    obj["sort"] = {};
    obj["sort"]["created_at"] = -1;

    if (limit)
      obj["limit"] = Session.get('thumbnails_in_row');

    return Patterns.find({}, obj);
    // This is a cursor use use .count in template to find number of items
  });

  UI.registerHelper('users', function(limit){
    var obj = {};
    obj["sort"] = {};
    obj["sort"]["profile.name_sort"] = 1;

    if (limit)
      obj["limit"] = Session.get('thumbnails_in_row');

    return Meteor.users.find({}, obj);
    // This is a cursor use use .count in template to find number of items
  });

  // *** has the user permission to create a new pattern? *** //
  UI.registerHelper('can_create_pattern', function(){
    return Meteor.my_functions.can_create_pattern();
  });

  UI.registerHelper('view_pattern_mode', function(){
    return Session.get('view_pattern_mode');
  });

  Template.left_column.helpers({
    selected: function(item) {
      var route = Router.current().route.getName();
      switch(item)
      {
        case "home":
        case "recent_patterns":
        case "new_patterns":
        case "my_patterns":
        case "all_patterns":
        case "users":
          if (route == item)
            return "selected";
          break;
      }
    }
  });

  ////////////////////////////////////
  Template.header.onRendered(function() {
    this.subscribe('patterns', {
        onReady: function () { 
          Session.set('patterns_ready', true);
          Meteor.subscribe('user_info');
          Meteor.subscribe('weaving_cells');
        }
      });
    this.subscribe('recent_patterns', {
      onReady: function() {
        Session.set('recents_ready', true);
      }
    });
  });

  Template.search.helpers({
    indexes: function () {
      return [patternsIndex, usersIndex];
    },
    patternsIndex: function () {
      return patternsIndex;
    },
    usersIndex: function () {
      return usersIndex;
    },
    attributes: function () {
      if (Session.get('window_width') > 650)
        return { 'class': 'easy-search-input', 'placeholder': 'Search for patterns...' };

      else if (Session.get('window_width') < 460)
        return { 'class': 'easy-search-input', 'placeholder': '' };

      else
        return { 'class': 'easy-search-input', 'placeholder': 'Search...' };
    },
    search_term: function() {
      return patternsIndex.getComponentDict().get('searchDefinition');
    },
    pattern_results_count: function() {
      return patternsIndex.getComponentDict().get('count');
    },
    users_results_count: function() {
      return usersIndex.getComponentDict().get('count');
    },
    css_class: function() {
      if (Session.get('window_width') > 650)
        return "wide";

      else if (Session.get('window_width') < 460)
        return "narrow";
    },
    more_patterns: function() {
      if (patternsIndex.getComponentMethods().hasMoreDocuments())
        return true;
    },
    more_users: function() {
      if (usersIndex.getComponentMethods().hasMoreDocuments())
        return true;
    }
  });

  Template.search.onRendered(function () {
    $('body').on("click", function(event){
      // close the results list if the user clicks outside it

      // if the results list is shown
      if ($('#search .results-wrapper').length != 0)
      {
        // did the user click outside the results list
        var results_list = $('.results-wrapper');

        if (!results_list.is(event.target) // if the target of the click isn't the container...
        && results_list.has(event.target).length === 0) // ... nor a descendant of the container
        {
          // but not in the search input?
          var input = $('#search .input-wrapper input.easy-search-input');

            if (!input.is(event.target)
          && input.has(event.target).length === 0)
          {
            Meteor.my_functions.hide_search_results();
          }
        }
      }
    });

    $(window).on("keyup", function(event) {
      // close the results list if the user presses 'Esc'

      // if the results list is shown
      if ($('#search .results-wrapper').length != 0)
      {
        if (event.which == 27) // user pressed 'Esc'
        Meteor.my_functions.hide_search_results();
      }
    })
  });

  Template.search.onDestroyed(function () {
    $('body').off("click");

    $(window).off("keyup");
  });

  Template.search.events({
    'click li': function () {
      // clear the search when you select a result
      $('input.easy-search-input').val("");
      Meteor.my_functions.hide_search_results();
    },
    'click #load_more_patterns': function(event) {
      if (patternsIndex.getComponentMethods().hasMoreDocuments())
        patternsIndex.getComponentMethods().loadMore(8);
    },
    'click #load_more_users': function(event) {
      if (usersIndex.getComponentMethods().hasMoreDocuments())
        usersIndex.getComponentMethods().loadMore(8);
    },
    'click #search .pattern_results': function(event) {
      event.preventDefault(); // to make router work from Home, not sure why but this is necessary when not already in pattern route
      Meteor.my_functions.search_result_clicked(this._id);
    }
  });

  UI.registerHelper('is_weaving', function(){
    if (Router.current().params.mode=="weaving")
      return true;
  });

  // this checks not only whether user_id is null but also whether the user curently has permission to see this user
  UI.registerHelper('user_exists', function(user_id){
    return (Meteor.users.find({ _id: user_id}).count() != 0);
  });

  UI.registerHelper('pattern_exists', function(pattern_id){
    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() != 0)
      return true;
  });

  UI.registerHelper('app_name_in_header', function(pattern_id){
    switch (Router.current().route.getName())
    {
      case "home":
      case "recent_patterns":
      case "new_patterns":
      case "my_patterns":
      case "all_patterns":
      case "users":
        return true;
        break;
    }
      
  });

  ///////////////////////////////
  // menu

  UI.registerHelper('menu_open', function()
  {
    if (Session.equals('menu_open', true))
      return "open";
  });

  UI.registerHelper('can_edit_pattern', function(pattern_id) {
    return Meteor.my_functions.can_edit_pattern(pattern_id);
  });

  ///////////////////////////////////
  // Menu - options for selected pattern
  Template.menu.helpers({
    show_menu: function(subscriptionsReady, route_name, pattern_id){
      return true; // there is now always at least one menu option
      /*if (Meteor.userId()) // account settings is available to any signed in user
        return true;

      if (subscriptionsReady && (route_name == "pattern") && (Patterns.find({ _id: pattern_id}).count() != 0)) // printer friendly view is available
        return true;

      else
        return false;*/
            /* show the menu if:
        * the user is signed in (Account settings)

      // file loading is supported by the browser and the user is signed in,
      // OR the user is viewing a specific pattern
      // if the user is not signed in, the only available menu option is to view the printer-friendly pattern
      // import, copy and export pattern are only available to users who can create patterns
      */

      /*if ((Meteor.my_functions.is_file_loading_supported() && Meteor.my_functions.can_create_pattern()) || (subscriptionsReady && (route_name == "pattern") && (Patterns.find({ _id: pattern_id}).count() != 0)))
        return true;*/
    },
    is_file_loading_supported: function()
    {
      if (Meteor.my_functions.is_file_loading_supported() && Meteor.my_functions.can_create_pattern())
        return true;

      else
        return false;
    }
  });

  Template.menu.events({
    'click #menu_button': function() {
      if (Session.equals('menu_open', true))
        Session.set('menu_open', false);

      else
        Session.set('menu_open', true);
    },
    'click #menu .menu_list ul li a': function(){
      Session.set('menu_open', false);
    },
    // import a pattern from a JSON file
    'click #import_pattern': function() {
      Session.set('show_import_pattern', true);
    },
    // copy this pattern to a new pattern
    // if route="pattern", the template _id is a pattern_id
    'click #copy_pattern': function(event, template) {
      if (Router.current().route.getName() == "pattern")
      {
        Meteor.my_functions.copy_pattern(template.data._id);
      }
    },
    // display this pattern as JSON
    'click #export_pattern': function() {
      Session.set('show_pattern_as_text', true);
    }
  });

  // Import pattern from file
  // Dialog to choose which type of file to import
  Template.import_pattern_dialog.helpers({
    'show_import_pattern': function() {
      if (Session.equals('show_import_pattern', true))
          return "visible";
    },
    'checked': function(name){
      if (Session.equals('import_file_type', name))
        return "true";
    },
    'disabled': function(){
      if (typeof Session.get('import_file_type') === "undefined")
        return "disabled";
    }
  });

  Template.import_pattern_dialog.events({
    'click #import_pattern_dialog .close': function(event) {
      Session.set('show_import_pattern', false);
    },
    'click #import_pattern_dialog .continue': function(event) {
      $('#file_picker').trigger('click');
      Session.set('show_import_pattern', false);
    },
    'change [name="file_type"]': function(){
      var file_types = document.getElementsByName('file_type');
      var selected_type;
      for(var i = 0; i < file_types.length; i++){
        if(file_types[i].checked){
            selected_type = file_types[i].value;
        }
      }
      Session.set('import_file_type', selected_type);
    }
  });

  // Import a file
  Template.import_file_picker.events({
  'change input#file_picker': function(event) {
    // Check for the various File API support.
    if (Meteor.my_functions.is_file_loading_supported())
    {
      var files = event.target.files; // FileList object
       f = files[0];
       
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {

            // find the filename so it can be used as a fallback pattern name
            // e.g. GTT files don't always have a name
            var filename = Meteor.my_functions.trim_file_extension(theFile.name);

            // be cautious about uploading large files
            if (theFile.size > 1000000)
              alert("Unable to load a file larger than 1MB");

            switch(Session.get('import_file_type'))
            {
              case "JSON":
                JsonObj = JSON.parse(e.target.result);
                Meteor.my_functions.import_pattern_from_json(JsonObj);
                break;

              case "GTT":
                Meteor.my_functions.import_pattern_from_gtt(e.target.result, filename);
                break;

              default:
                alert("Unrecognised file type, cannot import pattern")
                break;
            }
          };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsText(f);

        // reset the form so that the same file can be loaded twice in succession
        $(event.target).wrap('<form>').closest('form').get(0).reset();
        $(event.target).unwrap();

        // Prevent form submission
        event.stopPropagation();
        event.preventDefault();
      }
    }
  });

  ///////////////////////////////////
  // 'view pattern as text' (e.g. JSON) dialog
  Template.pattern_as_text.helpers({
    'show_pattern_as_text': function() {
      if (Session.equals('show_pattern_as_text', true))
          return "visible";
    },
    'pattern_as_json': function() {
      if (Session.equals('show_pattern_as_text', false))
          return;

      var pattern_id = this._id;
      var pattern_as_text = JSON.stringify(Meteor.my_functions.export_pattern_to_json(pattern_id), null, '\t'); // prettify JSON with tabs

      // make arrays more readable by removing new lines, spaces and tabs within them. But don't alter arrays of objects (styles).
      var original_arrays = [];
      var new_arrays = [];

      var re = /\[[^\][^\}]*?\]/g;
      // find text between [], may contain new lines http://stackoverflow.com/questions/6108555/replace-text-inside-of-square-brackets
      // ignore text containing [] or {}, i.e. nested brackets and objects in arrays
      for(m = re.exec(pattern_as_text); m; m = re.exec(pattern_as_text)){
        original_arrays.push(m[0]);
        var this_array = m[0];

        //this_array = this_array.replace(/ /g,'');// original, works but strips spaces from inside strings such as tags
        /*this_array.replace(/([^"]+)|("(?:[^"\\]|\\.)+")/, function($0, $1, $2) {
            if ($1) {
                return $1.replace(/\s/g, '');
            } else {
                return $2; 
            } 
        });*/ // works but long, from same source as below

        // remove spaces except for those between double quotes
        // http://stackoverflow.com/questions/14540094/javascript-regular-expression-for-removing-all-spaces-except-for-what-between-do
        var regex = /"[^"]+"|( )/g;
        this_array.replace(regex, function(m, group1) {
            if (group1 == "" ) return m;
            else return "";
        });

        this_array = this_array.replace(/\t/g,''); //remove tabs
        this_array = this_array.replace(/(\r\n|\n|\r)/gm,"");
        // line break removal http://www.textfixer.com/tutorials/javascript-line-breaks.php
        new_arrays.push(this_array);
      }
      for(var i = 0; i < original_arrays.length; i++) {
        pattern_as_text = pattern_as_text.split(original_arrays[i]).join(new_arrays[i]);
        // replace text http://stackoverflow.com/questions/5334380/replacing-text-inside-of-curley-braces-javascript
      }
      return pattern_as_text;
    }
  });

  Template.pattern_as_text.events({
    'click #pattern_as_text .close': function() {
      Session.set('show_pattern_as_text', false);
    },
    'click #pattern_as_text .select': function() {
      $('#pattern_as_text textarea').select();
    }
  });

  ///////////////////////////////////
  // reacting to database changes
  Tracker.autorun(function (computation) {
    
    // The publish functions don't automatically update queries to other collections. So the client resubscribes to pattern-related collections whenever the list of patterns that the user can see changes.
    // my_pattern_ids detects that Patterns has changed. Math.random triggers the re-subscription, otherwise Meteor refuses to run it.
//console.log(" autorun number of patterns " + Patterns.find().count());
    var my_pattern_ids = Patterns.find({}, {fields: {_id: 1}}).map(function(pattern) {return pattern._id});
    if (my_pattern_ids)
    {
      Meteor.subscribe('recent_patterns', Math.random());
      Meteor.subscribe('weaving_cells', Math.random());
    }
    
    if (Session.equals('patterns_ready', true) && Session.equals('recents_ready', true))
      Meteor.my_functions.maintain_recent_patterns(); // clean up the recent patterns list in case any has been changed

    // detect login / logout
    var currentUser = Meteor.user();
    if(currentUser){
      
      if (!Session.equals('was_signed_in', true))
      {
        Session.set('was_signed_in', true);
        setTimeout(function(){ Meteor.my_functions.resize_page();}, 20);
      }
    }
    else if(!computation.firstRun){ // avoid useless logout detection on app startup
      
      if (Session.equals('was_signed_in', true))
      {
        Session.set('was_signed_in', false);
        setTimeout(function(){ Meteor.my_functions.resize_page();}, 20);
      }
    }
  });

  Tracker.autorun(function (computation) {
    // Filters
    var max = Session.get('display_max_tablets');
    var min = Session.get('display_min_tablets');

    //if (display_max_tablets || display_min_tablets)
    if (min || max)
    {
      // All Patterns
      var filter = jQuery.extend({}, AllPatterns.filters);

      AllPatterns.set({
        filters: Meteor.my_functions.set_tablets_filter(filter, min, max)
      });

      // New Patterns
      var filter = jQuery.extend({}, NewPatterns.filters);

      NewPatterns.set({
        filters: Meteor.my_functions.set_tablets_filter(filter, min, max)
      });  

      // My Patterns
      var filter = jQuery.extend({}, MyPatterns.filters);

      MyPatterns.set({
        filters: Meteor.my_functions.set_tablets_filter(filter, min, max)
      });

      // User Patterns
      var filter = jQuery.extend({}, UserPatterns.filters);

      UserPatterns.set({
        filters: Meteor.my_functions.set_tablets_filter(filter, min, max)
      });
    }
  });
}

