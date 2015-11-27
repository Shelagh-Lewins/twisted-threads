// example from https://gist.github.com/patrickleet/e1c7a05eca86f536e3d4
// Note that Meteor.tags must be published
// also use {{#each tags}}<option...>{{else}}{{/each}} construction in template to avoid a blaze render error
// https://github.com/chhib/meteor-selectize-bootstrap-3/issues/2
Template.tagInput.rendered = function () {
  var that = this;
  this.$('.tag-input').selectize({
    valueField: 'name',
    labelField: 'name',
    searchField: ['name'],
    create: function(input, cb) {
      console.log('create tag: ', input)
      //Patterns.addTag(input.toLowerCase(), {_id: that.data._id}); // would like to use this to force all tags to be saved as lowercase but "NewTag" is not recognised as "newtag" until page refresh.
      Patterns.addTag(input, {_id: that.data._id});
      var tag =  Meteor.tags.findOne({collection: 'patterns', name: input});

      if (cb) {
        cb(tag);
      } 

      return tag;
    },
    options: Meteor.tags.find().fetch({}),
    render: {
        item: function(item, escape) {
            return '<div>' +
              (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '') +
            '</div>';
        },
        option: function(item, escape) {
            var name = item.name;
            var caption = item.nRefs;
            return '<div>' +
                '<span class="name">' + escape(name) + '</span>&nbsp;' +
                (caption ? '<span class="badge">(x' + escape(caption) + ')</span>' : '') +
            '</div>';
        }
    },
    onItemAdd: function(value, $item) {
      console.log('add tag: ', value);
      Patterns.addTag(value, {_id: that.data._id});
    },
    onItemRemove: function(value) {
      console.log('remove tag: ', value);
      Patterns.removeTag(value, {_id: that.data._id});
    },
    createFilter: function (value)
  {
    // Filter means you don't differentiate on case and avoid duplicate tags like mytag, Mytag
    // https://github.com/brianreavis/selectize.js/issues/796
    for (var optValue in this.options)
    {
      var name = this.options[optValue].name; // Property defined by labelField
      if (name.toLowerCase() === value.toLowerCase() && name !== value)
      {
        return false;
      }
    }
    return true;
  }
  });
};
