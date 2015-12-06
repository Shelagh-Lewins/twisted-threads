Patterns = new Meteor.Collection('patterns');
// tags on patterns
Tags.TagsMixin(Patterns); // https://atmospherejs.com/patrickleet/tags
Patterns.allowTags(function (userId) { return true; });

// search patterns
patternsIndex = new EasySearch.Index({
  collection: Patterns,
  fields: ['name', 'tags', 'created_by_username', 'number_of_tablets'],
  defaultSearchOptions: {
    limit: 6
  },
  engine: new EasySearch.Minimongo() // search only on the client, so only published documents are returned
});

usersIndex = new EasySearch.Index({
  collection: Meteor.users,
  fields: ['username', 'profile.description'],
  defaultSearchOptions: {
    limit: 6
  },
  engine: new EasySearch.Minimongo() // search only on the client, so only published documents are returned
});

//Settings = new Mongo.Collection('settings');
Threading = new Mongo.Collection('threading'); // contains the individual threading cells for each pattern
Weaving = new Mongo.Collection('weaving'); // contains the individual weaving schedule cells for each pattern
Orientation = new Mongo.Collection('orientation'); // contains the orientation (S or Z) for each tablet in each pattern
Styles = new Mongo.Collection('styles'); // contains the individual styles for each pattern
Recent_Patterns = new Mongo.Collection('recent_patterns'); // records the patterns each user has viewed / woven recently

// Polyfill in case indexOf not supported, not that we are necessarily expecting to support IE8-
// https://gist.github.com/revolunet/1908355
// Just being careful
if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length >>> 0;
    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

Router.configure({
  layoutTemplate: 'main_layout',
  loadingTemplate: 'loading'
});

Router.route('/', {
  name: 'home',
  template: 'home'
});

Router.route('/pattern/:_id/:mode?', {
  name: 'pattern',
  data: function(){
    var pattern_id = this.params._id;

    return Patterns.findOne({ _id: pattern_id });
  },
  waitOn: function(){
    var pattern_id = this.params._id;
    
    return [
      Meteor.subscribe('patterns', {
        onReady: function(){
          var pattern_id = Router.current().params._id;
          /*if (Patterns.find({ _id: pattern_id}).count() != 0)
          {
            var created_by_id = Patterns.findOne({ _id: pattern_id}).created_by;
            Meteor.subscribe('user_info', created_by_id);
          }*/
        }
      }),
      Meteor.subscribe('tags'),
      Meteor.subscribe('weaving', pattern_id),
      Meteor.subscribe('threading', pattern_id),
      Meteor.subscribe('orientation', pattern_id),
      Meteor.subscribe('styles', pattern_id),
      Meteor.subscribe('recent_patterns') // to check for current_weave_row
    ];
  },
  action: function() {
    var pattern_id = this.params._id;

    if (Patterns.find({ _id: pattern_id}).count() == 0)
    {
      this.layout('main_layout');
      this.render("pattern_not_found");
      this.render(null, {to: 'footer'}); // yield regions must be manually cleared
    }
 
    else if (this.params.mode == "weaving")
    {
      this.render('weave_pattern');
      this.render(null, {to: 'footer'});
    }

    else if (this.params.mode == "print")
    {
      this.layout('print_layout');
      this.render('print_pattern');
      this.render(null, {to: 'footer'});
    }

    else
    {
      this.render('view_pattern');
      if (Meteor.my_functions.can_edit_pattern(pattern_id))
        this.render('styles_palette', {to: 'footer'});

      else
        this.render(null, {to: 'footer'});
    }
         
  }
});

Router.route('/user/:_id', {
  name: 'user',
  data: function(){
    var user_id = this.params._id;

    //if (Meteor.users.find({ _id: user_id}).count() == 0)
      //this.render("user_not_found");
    
    //else
      return Meteor.users.findOne({ _id: user_id });
  },
  waitOn: function(){
    var user_id = this.params._id;
    
    return [
      Meteor.subscribe('user_info'),
      Meteor.subscribe('patterns', user_id)
    ]
  },
  action: function() {
    var user_id = this.params._id;

    if (Meteor.users.find({ _id: user_id}).count() == 0)
      this.render("user_not_found");
    
    else
      this.render("user");
  }
});

Router.route('/account-settings', {
  name: 'account_settings',
  data: function() {
    var user_id = this.params._id;
    return Meteor.users.findOne({ _id: user_id });
  },
  waitOn: function(){
    return [
      Meteor.subscribe('user_info')
    ]
  },
  action: function() {
    var user_id = this.params._id;
    this.render("account_settings");
  }
})

////////////////////////
// extends 'check' functionality
// check(userId, NonEmptyString);
NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});

if (Meteor.isClient) {
  // default accounts-ui package
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
    });
  });

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
        return true;
    }
  });

  /* *** Helper functions that may be used by more than one template *** */
  // Allows a template to check whether a helper value equals a string
  UI.registerHelper('signed_in', function () {
    if (Meteor.userId())
      return "signed_in";
  });

  UI.registerHelper('equals', function (a, b) {
    return a === b;
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

    switch (Meteor.status().status)
    {
      case "connecting":  // Fallthrough
      case "waiting":
        return "trying_to_connect";
        break;

      case "failed":  // Fallthrough
      case "offline":
        return "disconnected";
        break;

      case "connected":
        return "connected";
        break;

      default:
        return;
    }
  });

  //////////////////////////////////
  // Used in header to display correct buttons and title depending on route and params
  // Used in menu to determine menu entries
  UI.registerHelper('route_name', function(){
    return Router.current().route.getName();
  });

  Template.header.onCreated(function() {
    this.subscribe('patterns');
    this.subscribe('recent_patterns');
  });

  Template.header.events({
    // The router doesn't show the 'loading' template for these actions because only the data changes, not the route. So here we manually trigger a simple "Loading..." display to help the user when switching between view pattern and weave.
    'click #start_weaving': function(){
      Session.set("loading", true);
    },
    'click #stop_weaving': function(){
      Session.set("loading", true);
    }
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
      //return $('input.easy-search-input').val();
      return patternsIndex.getComponentDict().get('searchDefinition');
    },
    css_class: function() {
      if (Session.get('window_width') > 650)
        return "wide";

      else if (Session.get('window_width') < 460)
        return "narrow";
    },
    is_searching: function() {
      if (patternsIndex.getComponentMethods().isSearching() && usersIndex.getComponentMethods().isSearching())
        return true;
    },
    no_results: function() {
      if (patternsIndex.getComponentMethods().hasNoResults() && usersIndex.getComponentMethods().hasNoResults())
        return true;
    },
    more_documents: function() {
      if (patternsIndex.getComponentMethods().hasMoreDocuments() || usersIndex.getComponentMethods().hasMoreDocuments())
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
    'click #load_more': function(event) {
      event.preventDefault();

      if (patternsIndex.getComponentMethods().hasMoreDocuments())
      {
        if (usersIndex.getComponentMethods().hasMoreDocuments())
        {
          // load more docs from both indexes
          usersIndex.getComponentMethods().loadMore(4);
          patternsIndex.getComponentMethods().loadMore(4);
        }
        else
        {
          // load more docs for patternsIndex only
          patternsIndex.getComponentMethods().loadMore(8);
        }
      }
      else if (usersIndex.getComponentMethods().hasMoreDocuments())
      {
        // load more docs for usersIndex only
        usersIndex.getComponentMethods().loadMore(8);
      }

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
    return (Patterns.find({ _id: pattern_id}).count() != 0);
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
      // show the menu if either
      // file loading is supported by the browser and the user is signed in,
      // OR the user is viewing a specific pattern
      // if the user is not signed in, the only available menu option is to view the printer-friendly pattern
      // import, copy and export pattern are only available to signed in users

      if ((Meteor.my_functions.is_file_loading_supported() && Meteor.userId()) || (subscriptionsReady && (route_name == "pattern") && (Patterns.find({ _id: pattern_id}).count() != 0)))
        return true;
    },
    is_file_loading_supported: function()
    {
      if (Meteor.my_functions.is_file_loading_supported())
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
    var my_pattern_ids = Patterns.find({
      $or: [
        { private: {$ne: true} },
        { created_by: this.userId }
      ]
    }).map(function(pattern) {return pattern._id});

    if (my_pattern_ids)
    {
      //console.log("subscribing");
      Meteor.subscribe('recent_patterns', Math.random());


      if(Router.current())
      {
        Meteor.subscribe('user_info', Math.random());

        if (Router.current().route.getName() == "pattern")
        {
          var pattern_id = Router.current().params._id;
          
          Meteor.subscribe('weaving', pattern_id, Math.random());
          //Meteor.subscribe('tags', Math.random()),
          Meteor.subscribe('threading', pattern_id, Math.random());
          Meteor.subscribe('orientation', pattern_id, Math.random());
          Meteor.subscribe('styles', pattern_id, Math.random());
        }
      }
    }

    // detect login / logout
    var currentUser=Meteor.user();
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
}

