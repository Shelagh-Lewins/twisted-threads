// general parameters
Meteor.my_params = {}; // namespace for parameters
Meteor.my_params.undo_stack_length = 10;
Meteor.my_params.special_styles_number = 16; // currently up to 16 special styles allowing 3 multiple turns and 4 other single styles
Meteor.my_params.pattern_thumbnail_width = 248; // tiled pattern thumbnails
Meteor.my_params.pattern_thumbnail_rmargin = 16; // right margin
Meteor.my_params.max_recents = 12;
Meteor.my_params.default_pattern_name = "New pattern";

default_special_styles = [
{
  "background_color": "#FFFFFF",
  "image": "/images/special_forward_2.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_backward_2.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_forward_3.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_backward_3.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_forward_4.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_backward_4.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_empty.svg"
},
{
  "background_color": "#FFFFFF",
  "image": ""
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_backward_2.svg"
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_forward_2.svg"
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_backward_3.svg"
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_forward_3.svg"
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_backward_4.svg"
},
{
  "background_color": "#BBBBBB",
  "image": "/images/special_forward_4.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_backward_strike.svg"
},
{
  "background_color": "#FFFFFF",
  "image": "/images/special_forward_strike.svg"
}
];
