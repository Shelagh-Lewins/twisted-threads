Router.configure({
  layoutTemplate: 'main_layout',
  loadingTemplate: 'loading'
});

// waitOn makes initial page render very slow, maybe 15 seconds. On pages like Home that list patterns, it's better to see the page sooner and watch the patterns appear.

Router.route('/', {
  name: 'home',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'home'
});

Router.route('/about', {
  name: 'about',
  loadingTemplate: 'loading',
  template: 'about'
});

Router.route('/recent-patterns', {
  name: 'recent_patterns',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'recent_patterns'
});

Router.route('/new-patterns', {
  name: 'new_patterns',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'new_patterns'
});

Router.route('/my-patterns', {
  name: 'my_patterns',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'my_patterns'
});

Router.route('/all-patterns', {
  name: 'all_patterns',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'all_patterns'
});

Router.route('/users', {
  name: 'users',
  loadingTemplate: 'loading',
  fastRender: true,
  template: 'users'
});


Router.route('/pattern/:_id/:mode?', {
  name: 'pattern',
  loadingTemplate: 'loading',
  data: function(){
    var pattern_id = this.params._id;

    return Patterns.findOne({ _id: pattern_id }, {fields: {weaving: 0, threading: 0, orientation: 0}});
  },
  waitOn: function(){
    var pattern_id = this.params._id;
    
    return [

      // since upgrade from 1.2 to 1.6, it seems to be necessary to pass an undefined created_by parameter, otherwise {} is passed which fails Check in publish.js
      Meteor.subscribe('patterns', undefined, {
        onReady: function(){
          var pattern_id = Router.current().params._id;
        }
      }),
      Meteor.subscribe('tags'),

      Meteor.subscribe('recent_patterns') // to check for current_weave_row
      
    ];
  },
  fastRender: true,
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
  loadingTemplate: 'loading',
  data: function(){
    var user_id = this.params._id;

    return Meteor.users.findOne({ _id: user_id });
  },
  waitOn: function(){
    var user_id = this.params._id;
    return [
      Meteor.subscribe('user_info'),
      Meteor.subscribe('patterns', user_id, "susan")
    ]
  },
  fastRender: true,
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
  loadingTemplate: 'loading',
  data: function() {
    var user_id = this.params._id;
    return Meteor.users.findOne({ _id: user_id });
  },
  waitOn: function(){
    return [
      Meteor.subscribe('user_info')
    ]
  },
  fastRender: true,
  action: function() {
    var user_id = this.params._id;
    this.render("account_settings");
  }
})
