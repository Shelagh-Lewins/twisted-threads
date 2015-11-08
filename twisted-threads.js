Patterns = new Meteor.Collection('patterns');
//Settings = new Mongo.Collection('settings');
Threading = new Mongo.Collection('threading'); // contains the individual threading cells for each pattern
Weaving = new Mongo.Collection('weaving'); // contains the individual weaving schedule cells for each pattern
Orientation = new Mongo.Collection('orientation'); // contains the orientation (S or Z) for each tablet in each pattern
Styles = new Mongo.Collection('styles'); // contains the individual styles for each pattern
Recent_Patterns = new Mongo.Collection('recent_patterns'); // records the patterns each user has viewed / woven recently

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
          var created_by_id = Patterns.findOne({ _id: pattern_id}).created_by;
          Meteor.subscribe('user_info', created_by_id);
        }
      }),
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

    if (Meteor.users.find({ _id: user_id}).count() == 0)
      this.render("user_not_found");
    
    else
      return Meteor.users.findOne({ _id: user_id });
  },
  waitOn: function(){
    var user_id = this.params._id;
    
    return [
      Meteor.subscribe('user_info', user_id),
      Meteor.subscribe('patterns', user_id)
    ]
  }
})

if (Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
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

  UI.registerHelper('is_weaving', function(){
    if (Router.current().params.mode=="weaving")
      return true;
  });

  // this checks not only whether user_id is null but also whether the user curently has permission to see this user
  UI.registerHelper('user_exists', function(user_id){
    return (Meteor.users.find({ _id: user_id}).count() != 0)
  });

  UI.registerHelper('pattern_exists', function(pattern_id){
    return (Patterns.find({ _id: pattern_id}).count() != 0)
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
      $('#import_file').trigger('click');
      //Session.set('menu_open', false);
      
    },
    // copy this pattern to a new pattern
    // if route="pattern", the template _id is a pattern_id
    'click #copy_pattern': function(event, template) {
      if (Router.current().route.getName() == "pattern")
      {
        Meteor.my_functions.copy_pattern(template.data._id);
        //Session.set('menu_open', false);
      }
    },
    // display this pattern as JSON
    'click #export_pattern': function() {
      //Session.set('menu_open', false);
      Session.set('show_pattern_as_text', true);
    }
  });

  Template.import_file_picker.events({
  'change input#import_file': function(evt) {
    var files = evt.target.files; // FileList object
     f = files[0];
      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          // Render thumbnail.
         JsonObj = JSON.parse(e.target.result);

         Meteor.my_functions.import_pattern_from_json(JsonObj);
         
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
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
      return JSON.stringify(Meteor.my_functions.export_pattern_to_json(pattern_id));
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
      Meteor.subscribe('recent_patterns', Math.random());

      if(Router.current())
      {
        if (Router.current().route.getName() == "pattern")
        {
          var pattern_id = Router.current().params._id;
          
          Meteor.subscribe('weaving', pattern_id, Math.random()),
          Meteor.subscribe('threading', pattern_id, Math.random()),
          Meteor.subscribe('orientation', pattern_id, Math.random()),
          Meteor.subscribe('styles', pattern_id, Math.random())
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

