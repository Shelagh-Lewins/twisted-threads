// general parameters that do not affect security
Meteor.my_params = { // namespace for parameters
  undo_stack_length: 10,
  special_styles_number: 16, // currently up to 16 special styles allowing 3 multiple turns and 4 other single styles
  pattern_thumbnail_width: 248, // tiled pattern thumbnails
  pattern_thumbnail_rmargin:16, // right margin
  max_recents: 12,
  default_pattern_name: "New pattern",
  default_special_styles: [
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
  }
  ]
}
