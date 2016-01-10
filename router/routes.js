Router.configure({
  layoutTemplate: 'main_layout',
  loadingTemplate: 'loading'
});

Router.route('/', {
  name: 'home',
  template: 'home'
});

Router.route('/recent-patterns', {
  name: 'recent_patterns',
  template: 'recent_patterns'
});

Router.route('/new-patterns', {
  name: 'new_patterns',
  template: 'new_patterns'
});

Router.route('/my-patterns', {
  name: 'my_patterns',
  template: 'my_patterns'
});

Router.route('/all-patterns', {
  name: 'all_patterns',
  template: 'all_patterns'
});

Router.route('/users', {
  name: 'users',
  template: 'users'
});


Router.route('/pattern/:_id/:mode?', {
  name: 'pattern',
  data: function(){
    var pattern_id = this.params._id;

    return Patterns.findOne({ _id: pattern_id }, {fields: {weaving: 0, threading: 0, orientation: 0}});
  },
  waitOn: function(){
    var pattern_id = this.params._id;
    
    return [
      Meteor.subscribe('patterns', {
        onReady: function(){
          var pattern_id = Router.current().params._id;
        }
      }),
      Meteor.subscribe('tags'),

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
      //console.log("router changes");
      //Meteor.my_functions.initialize_view_pattern(pattern_id);
      Meteor.my_functions.add_to_recent_patterns(pattern_id);

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
