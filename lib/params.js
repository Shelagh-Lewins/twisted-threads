// general parameters that do not affect security
Meteor.my_params = { // namespace for parameters
  undo_stack_length: 10,
  special_styles_number: 16, // currently up to 16 special styles allowing 3 multiple turns and 4 other single styles
  pattern_thumbnail_width: 248, // tiled pattern thumbnails
  pattern_thumbnail_rmargin:16, // right margin
  max_recents: 4,
  max_auto_turns: 48,
  number_of_packs: 3, // packs in simulation pattern, manual mode
  default_pattern_name: "New pattern",
  default_special_styles: [
    {
      "background_color": "#FFFFFF",
      "name": "forward_2",
      "warp": "forward",
      "image": "/images/special_forward_2.svg",
      "style": "S1"
    },
    {
      "background_color": "#FFFFFF",
      "name": "backward_2",
      "warp": "backward",
      "image": "/images/special_backward_2.svg",
      "style": "S2"
    },
    {
      "background_color": "#FFFFFF",
      "name": "forward_3",
      "warp": "forward",
      "image": "/images/special_forward_3.svg",
      "style": "S3"
    },
    {
      "background_color": "#FFFFFF",
      "name": "backward_3",
      "warp": "backward",
      "image": "/images/special_backward_3.svg",
      "style": "S4"
    },
    {
      "background_color": "#FFFFFF",
      "name": "forward_4",
      "warp": "forward",
      "image": "/images/special_forward_4.svg",
      "style": "S5"
    },
    {
      "background_color": "#FFFFFF",
      "name": "backward_4",
      "warp": "backward",
      "image": "/images/special_backward_4.svg",
      "style": "S6"
    },
    {
      "background_color": "#FFFFFF",
      "image": "/images/special_empty.svg",
      "style": "S7"
    },
    {
      "background_color": "#FFFFFF",
      "image": "",
      "style": "S8"
    },
    {
      "background_color": "#BBBBBB",
      "name": "backward_2_gray",
      "warp": "backward",
      "image": "/images/special_backward_2.svg",
      "style": "S9"
    },
    {
      "background_color": "#BBBBBB",
      "name": "forward_2_gray",
      "warp": "forward",
      "image": "/images/special_forward_2.svg",
      "style": "S10"
    },
    {
      "background_color": "#BBBBBB",
      "name": "backward_3_gray",
      "warp": "backward",
      "image": "/images/special_backward_3.svg",
      "style": "S11"
    },
    {
      "background_color": "#BBBBBB",
      "name": "forward_3_gray",
      "warp": "forward",
      "image": "/images/special_forward_3.svg",
      "style": "S12"
    },
    {
      "background_color": "#BBBBBB",
      "name": "backward_4_gray",
      "warp": "backward",
      "image": "/images/special_backward_4.svg",
      "style": "S13"
    },
    {
      "background_color": "#BBBBBB",
      "name": "forward_4_gray",
      "warp": "forward",
      "image": "/images/special_forward_4.svg",
      "style": "S14"
    },
    {
      "background_color": "#FFFFFF",
      "name": "idle",
      "image": "/images/special_idle.svg",
      "style": "S15"
    },
    {
      "background_color": "#FFFFFF",
      "image": "",
      "style": "S16"
    }
  ]
}
