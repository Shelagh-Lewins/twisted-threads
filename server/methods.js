Meteor.methods({
  //////////////////////
  // Pattern management
  show_pattern_tags: function() {
    // for internal use only
    console.log("All tags " + Meteor.tags.find().fetch().map(function(tag) {return tag.name}));
  },
  can_create_pattern: function() {
    if (!Meteor.userId())
      return false;

    var count = Patterns.find({created_by: Meteor.userId()}).count();

    if (Roles.userIsInRole( Meteor.userId(), 'verified', 'users' ))
    {
      if (Roles.userIsInRole( Meteor.userId(), 'premium', 'users' ))
      {
        if (count < Meteor.settings.public.max_patterns_per_user.premium)
          return true;

        else
          return false;
      }
      else
      {
        if (count < Meteor.settings.public.max_patterns_per_user.verified)
          return true;

        else
          return false;
      }
    }
    // if the user's email address is not verified, they can only create 1 pattern
    else
    {
      if (count < Meteor.settings.public.max_patterns_per_user.default)
        return true;

      else 
        return false;
    }
  },
  new_pattern_from_json: function(options) {
    // options
    /* {
      name: "pattern name", //optional
      data: json data object,
      filename: "pattern.json" // one of filename or data is required
    } */

    // if number_of_tablets and number_of_rows are both specified, a blank pattern will be built with style 1 for all weaving and threading cells

    check(options, {
      number_of_tablets: Match.Optional(String),
      number_of_rows: Match.Optional(String),
      name: Match.Optional(String),
      data: Match.Optional(Object),
      filename: Match.Optional(String) 
    });

    if (!Meteor.isServer) // minimongo cannot simulate loading data with Assets
        return;

    if (!Meteor.userId()) {
      // Only logged in users can create patterns
      throw new Meteor.Error("not-authorized", "You must be signed in to create a new pattern");
    }

    var result = Meteor.call('can_create_pattern');
    if (!result)
      throw new Meteor.Error("not-authorized", "You may not create any more patterns");

    if (typeof options.data !== "undefined")
    {
      var data = options.data;
    }
    else if (typeof options.filename !== "undefined")
    {
      try {
        var data = JSON.parse(Assets.getText(options.filename));
      }
      catch(e)
      {
        //return -1;
        throw new Meteor.Error("file-load-failed", "File load error in new_pattern_from_json");
      }
    }
    else
    {
      //return -1;
      throw new Meteor.Error("file-load-failed", "File load error in new_pattern_from_json");
    }

    // check version
    var version = [0,0];
    if (typeof data.version !== "undefined")
    {
      var split_version = data.version.split("."); // [main, subsidiary] e.g. 2.1
      if (typeof split_version[0] !== "undefined")
      {
        version[0] = parseInt(split_version[0]);

        if (typeof split_version[1] !== "undefined")
        {
          version[1] = parseInt(split_version[1]);
        }
      } 
    }

    // Numbers of rows and tablets
    // have both rows and tablets been specified as positive integers less than 100?
    var build_new = true; // whether to build a blank pattern using a specified number of tablets and rows
    if ((typeof options.number_of_tablets !== "undefined") && (typeof options.number_of_rows !== "undefined"))
    {
      var tablets = parseInt(options.number_of_tablets);

      if (isNaN(tablets))
        build_new = false;

      else if ((tablets <1) || (tablets > 100))
        build_new = false;

      var rows = parseInt(options.number_of_rows);

      if ((rows <1) || (rows > 100))
        build_new = false;

      else if ((rows <1) || (rows > 100))
        build_new = false;
    }
    else
    {
      build_new = false;
    }

    if (build_new)
    {
      // build pattern data
      // weaving
      data.weaving = new Array(options.number_of_rows);

      for (var i=0; i<options.number_of_rows; i++)
      {
        data.weaving[i] = new Array(options.number_of_tablets);
        for (var j=0; j<options.number_of_tablets; j++)
        {
          data.weaving[i][j] = 3; // plain white in default pattern
        }
      }

      // threading
      data.threading = new Array(options.number_of_rows);

      for (var i=0; i<4; i++)
      {
        data.threading[i] = new Array(options.number_of_tablets);
        for (var j=0; j<options.number_of_tablets; j++)
        {
          data.threading[i][j] = 3; // plain white in default pattern
        }
      }

      // orientation
      data.orientation = new Array(number_of_tablets);
      for (var i=0; i<options.number_of_tablets; i++)
      {
        data.orientation[i] = "S";

      }
    }
    else if (typeof data.threading[0] === "undefined") // no rows of threading have been defined
    {
      throw new Meteor.Error("no-threading-data", "error creating pattern from JSON. No threading data");
    }

    var number_of_rows = data.weaving.length;
    var number_of_tablets = data.threading[0].length; // there may be no weaving rows but there must be threading

    // try to prevent huge patterns that would fill up the database
    if (number_of_rows > Meteor.settings.private.max_pattern_rows)
      throw new Meteor.Error("too-many-rows", "error creating pattern from JSON. Too many rows.");

    if (number_of_rows > Meteor.settings.private.max_pattern_tablets)
      throw new Meteor.Error("too-many-tablets", "error creating pattern from JSON. Too many tablets.");

    if(options.name == "")
      options.name = Meteor.my_params.default_pattern_name;

    data.name = options.name;

    // tags
    if (typeof data.tags === "undefined")
      data.tags = [];

    var description ="";
    if (typeof data.description !== "undefined")
      description = data.description;

    var weaving_notes = "";
    if (typeof data.weaving_notes !== "undefined")
      weaving_notes = data.weaving_notes;

    var threading_notes = "";
    if (typeof data.threading_notes !== "undefined")
      threading_notes = data.threading_notes;

    var pattern_id = Patterns.insert({
      name: data.name,
      description: description,
      weaving_notes: weaving_notes,
      threading_notes: threading_notes,
      private: true, // patterns are private by default so the user can edit them before revealing them to the world
      // TODO add specific thumbnails for patterns
      number_of_rows: number_of_rows,
      number_of_tablets: number_of_tablets,
      created_at: moment().valueOf(),            // current time
      created_by: Meteor.userId(),           // _id of logged in user
      created_by_username: Meteor.user().username  // username of logged in user
    });
      // Tags
    for (var i=0; i<data.tags.length; i++)
    {
      Patterns.addTag(data.tags[i], { _id: pattern_id });
    }

    // Styles
    var styles_array = [];
    for (var i=0; i<32; i++) // create 32 styles
    {
      styles_array[i] = data.styles[i];

      // version 1 has style.backward_stroke, style.forward_stroke
      // convert to 2+
      // style.stroke "forward" "backward" "none (other values possible in 2+)
      
      if (data.styles[i].backward_stroke)
        data.styles[i].warp = "backward";
        
      if (data.styles[i].forward_stroke) // if both defined, choose forward
        data.styles[i].warp = "forward";
        
      delete data.styles[i].backward_stroke;
      delete data.styles[i].forward_stroke;
      //console.log("style " + JSON.stringify(data.styles[i]));
      if (typeof data.styles[i].warp === "undefined")
        data.styles[i].warp = "none";
    }
    Patterns.update({_id: pattern_id}, {$set: {styles: JSON.stringify(styles_array)}});

    // Special styles
    var special_styles_array = [];
    if (typeof data.special_styles === "undefined")
      data.special_styles = [];

    for (var i=0; i<Meteor.my_params.special_styles_number; i++)
    {
      special_styles_array[i] = data.special_styles[i];
    }
    Patterns.update({_id: pattern_id}, {$set: {special_styles: JSON.stringify(special_styles_array)}});

    // Pattern
    var weaving = new Array(number_of_rows);
    for (var i=0; i<number_of_rows; i++)
    {
      weaving[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        weaving[i][j] = data.weaving[i][j];
      }
    }

    Patterns.update({_id: pattern_id}, {$set: {weaving: JSON.stringify(weaving)}});

    //////////////////////////////

    // Threading
    var threading = new Array(4);
    for (var i=0; i< 4; i++)
    {
      threading[i] = new Array(number_of_tablets);

      for (var j=0; j<number_of_tablets; j++)
      {
        threading[i][j] = data.threading[i][j];
      }
    }

    Patterns.update({_id: pattern_id}, {$set: {threading: JSON.stringify(threading)}});

    // Orientation
    var orientation = new Array(number_of_tablets);
    for (var i=0; i<number_of_tablets; i++)
    {
      orientation[i] = data.orientation[i];
    }

    Patterns.update({_id: pattern_id}, {$set: {orientation: JSON.stringify(orientation)}});

    return pattern_id;
  },
  xml2js: function(data) {
    // use xml2js package to convert XML to JSON
    // see https://github.com/Leonidas-from-XIV/node-xml2js for documentation of xml2js
    check(data, String);

    var convertAsyncToSync  = Meteor.wrapAsync( xml2js.parseString ),
      resultOfAsyncToSync = convertAsyncToSync( data, {} ); // {} would be 'this' context if required
    return resultOfAsyncToSync;

    /*
    package:
    https://github.com/peerlibrary/meteor-xml2js
    meteor add peerlibrary:xml2js

    usage:
    https://github.com/Leonidas-from-XIV/node-xml2js

    wrapasync tutorial:
    https://themeteorchef.com/snippets/synchronous-methods/#tmc-using-wrapasync

    // usage from client:
    var data = "<root>Hello xml2js! New2</root>";
    Meteor.call('xml2js',data, function(error, result){
      if (!error) {
      console.log("got xml " + JSON.stringify(result));
      }
      else {
        console.log(error);
      }
    })
    */
  },
  ///////////////////////////////
  // Modify patterns
  remove_pattern: function(pattern_id) {
    check(pattern_id, String);

    if (!Meteor.isServer) // attempt to avoid error "server sent add for existing id"
        return;

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove patterns that you created");

    Patterns.remove(pattern_id);
    Recent_Patterns.remove({pattern_id: pattern_id});
    Images.remove({used_by: pattern_id});
  },
  set_private: function (pattern_id, set_to_private) {
    check(pattern_id, String);
    check(set_to_private, Boolean);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only change the privacy on a pattern you created");
 
    Patterns.update(pattern_id, { $set: { private: set_to_private } });
  },
  ///////////////////////////////
  // Stringify pattern data and save it
  save_weaving_as_text: function(pattern_id, text, number_of_rows, number_of_tablets)
  {
    check(pattern_id, String);
    check(text, String);
    check(number_of_rows, Number);
    check(number_of_tablets, Number);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // try to prevent huge patterns that would fill up the database
    if (number_of_rows > Meteor.settings.private.max_pattern_rows)
      throw new Meteor.Error("too-many-rows", "error saving pattern. Too many rows.");

    if (number_of_rows > Meteor.settings.private.max_pattern_tablets)
      throw new Meteor.Error("too-many-tablets", "error saving pattern. Too many tablets.");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { weaving: text}});

    // Record the number of rows
    Patterns.update({_id: pattern_id}, {$set: {number_of_rows: number_of_rows}});

    // Record the number of tablets
    Patterns.update({_id: pattern_id}, {$set: {number_of_tablets: number_of_tablets}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_threading_as_text: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { threading: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_orientation_as_text: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { orientation: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  save_styles_as_text: function(pattern_id, text)
  {
    check(pattern_id, String);
    check(text, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit styles in a pattern you created");

    // Save the individual cell data
    Patterns.update({_id: pattern_id}, {$set: { styles: text}});

    // Record the edit time
    Meteor.call("save_pattern_edit_time", pattern_id);
  },
  restore_pattern: function(data)
  {
    check(data, Object);

    var pattern = Patterns.findOne({_id: data._id}, {fields: {created_by: 1 }});

    if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only restore a pattern you created");

    // reconstruct the pattern according to the data, e.g. for undo
    Meteor.call('save_weaving_as_text', data._id, JSON.stringify(data.weaving), data.number_of_rows, data.number_of_tablets);
    Meteor.call('save_threading_as_text', data._id, JSON.stringify(data.threading));
    Meteor.call('save_orientation_as_text', data._id, JSON.stringify(data.orientation));
    Meteor.call('save_styles_as_text', data._id, JSON.stringify(data.styles)); 
    return;
  },
  save_pattern_edit_time: function(pattern_id)
  {
    check(pattern_id, String);
    Patterns.update({_id: pattern_id}, {$set: {pattern_edited_at: moment().valueOf()}});
  },
  ///////////////////////////////
  // Edit other pattern properties
  toggle_hole_handedness: function(pattern_id)
  {
    check(pattern_id, String);

    var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1, hole_handedness: 1}});

    if (pattern.created_by != Meteor.userId())
      // Only the owner can edit a pattern
      throw new Meteor.Error("not-authorized", "You can only edit hole handedness for a pattern you created");

    // default is clockwise if not otherwise specified
    var new_value = "anticlockwise";
    if (pattern.hole_handedness == "anticlockwise")
      new_value = "clockwise";

    Patterns.update({_id: pattern_id}, {$set: {hole_handedness: new_value}});
  },
  add_pattern_thumbnail: function(pattern_id, fileObj)
  {
    console.log("add_pattern_thumbnail");
    console.log("fileObj keys " + Object.keys(fileObj));
  },
  ///////////////////////////////
  // Edit styles
  set_pattern_cell_style: function(pattern_id, row, tablet, new_style)
  {
    check(pattern_id, String);
    check(row, Number);
    check(tablet, Number);
    check(new_style, Number);

    if (Meteor.isServer)
    {
      var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId())
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit cells in a pattern you created");

      // This construction allows variable properties of the document to be set
      var update = {};
      update["weaving." + row + "." + tablet + ".style"] = new_style;
      Patterns.update({_id: pattern_id}, {$set: update});
    }
  },
  set_threading_cell_style: function(pattern_id, hole, tablet, new_style)
  {
    check(pattern_id, String);
    check(hole, Number);
    check(tablet, Number);
    check(new_style, Number);

    if (Meteor.isServer)
    {
      var pattern = Patterns.findOne({_id: pattern_id}, {fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId()) {
        // Only the owner can edit a pattern
        throw new Meteor.Error("not-authorized", "You can only edit threading in a pattern you created");
      }

      // This construction allows variable properties of the document to be set
      var update = {};
      update["threading." + hole + "." + tablet + ".style"] = new_style;
      Patterns.update({_id: pattern_id}, {$set: update});
    }
  },

  //////////////////////////////////////
  // Recent patterns
  add_to_recent_patterns: function(pattern_id) {
    // Add a pattern to the Recent_Patterns collection
    // If it's already in the collection, update the accessed_at time
    // Recent patterns are stored for each user separately
    check(pattern_id, String);
    //console.log("add " + pattern_id);
    //console.log("adding to recent patterns " +pattern_id)
    if (!Meteor.userId()) // user is not signed in
      return;

    if (Patterns.find({_id: pattern_id}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
      return; // the pattern doesn't exist

    if (Recent_Patterns.find({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]}, {fields: {_id: 1}}, {limit: 1}).count() == 0)
    {
      // the pattern is not in the list, so add it
      Recent_Patterns.insert({
        pattern_id: pattern_id,
        accessed_at: moment().valueOf(),            // current time
        user_id: Meteor.userId()
      });
    }
    else
    {
      // the pattern is already in the list, so update it
;
      Recent_Patterns.update({ $and: [{pattern_id: pattern_id}, {user_id: Meteor.userId()}]}, { $set: {accessed_at: moment().valueOf()}});
    }

    if (Recent_Patterns.find({user_id: Meteor.userId()}).count() > Meteor.my_params.max_recents) // don't store too many patterns for any one user
    {
      var oldest_id = Recent_Patterns.find({user_id: Meteor.userId()}, {sort: {accessed_at: 1}}, {limit: 1}).fetch()[0]._id;

      Recent_Patterns.remove({_id: oldest_id});
    }
  },
  maintain_recent_patterns: function() {
    // remove any patterns that no longer exist or are now hidden from the user

    // Publish only returns the patterns the user has permission to see
    var my_patterns = Patterns.find({

    }).map(function(pattern) {return pattern._id});

    Recent_Patterns.remove({pattern_id: {$nin:my_patterns}});
  },
  set_current_weave_row: function(pattern_id, index) {
    check(pattern_id, String);
    check(index, Number);

    if (!Meteor.userId())
      return;

    if (index < 1)
      return;

    var pattern = Patterns.findOne({_id: pattern_id});

    if (typeof pattern === "undefined")
      return;

    var number_of_rows = pattern.number_of_rows;

    if (index > number_of_rows)
      return;

    Recent_Patterns.update({ $and: [{pattern_id: pattern_id}, {user_id:Meteor.userId()}]}, { $set: {current_weave_row: index}});

    return;
  },
  ///////////////////////////////
  // uploaded images
  // Is there already an image with this key?
  does_image_exist: function(key, cb) {

     // check if the image already exists in the S3 bucket
    var s3 = new AWS.S3({
      accessKeyId: Meteor.settings.private.AWSAccessKeyId,
      secretAccessKey: Meteor.settings.private.AWSSecretAccessKey//,
    });

    var params = {
      Bucket: Meteor.settings.private.AWSBucket, // 'mybucket'
      Key: key // 'images/myimage.jpg'
    };

    var my_fn = Meteor.wrapAsync(s3.headObject, s3);
    var results = my_fn(params, function(err, data) {

      if (err)
      {
       throw new Meteor.Error("object does not exist with key " + key);

      } else
      {
        return data;
      }
    });

    return results;
    // callback doesn't seem to work, results has no data and appears before callback
  },
  // Slingshot has added a new image to Amazon S3. Now log in it the Images collection.
  upload_pattern_image: function(downloadUrl, pattern_id, role, width, height){
    check(downloadUrl, NonEmptyString);
    check(pattern_id, NonEmptyString);
    check(role, NonEmptyString);
    check(width, Number);
    check(height, Number);

    var user = Meteor.user();
    if (!Meteor.userId())
      return;

    if (!user.emails[0].verified)
      throw new Meteor.Error("not-authorized", "You can only upload images if you have a verified email address");

    var pattern = Patterns.findOne({_id: pattern_id}, { fields: {created_by: 1}});

    if (pattern.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only upload images for patterns you created"); 

    if (Images.find({ used_by: pattern_id }).count() >= Meteor.settings.public.max_images_per_pattern)
      throw new Meteor.Error("limit-reached", "You cannot upload any more images for this pattern");

    var bucket = Meteor.settings.private.AWSBucket;
    var region = Meteor.settings.public.AWSRegion;

    // Find the key by stripping out the first part of the image url
    var key = downloadUrl.replace('https://' + bucket + ".s3-" + region + '.amazonaws.com/', ''); // used to delete the object from AWS

    if (Images.find({key:key}).count() == 0)
    {
      // add the new object to the Images collection
      var image_id = Images.insert({
          url: downloadUrl,
          key: key,
          created_at: moment().valueOf(),            // current time
          created_by: Meteor.userId(),           // _id of logged in user
          created_by_username: Meteor.user().username,  // username of logged in user
          used_by: pattern_id,
          role: role,
          width: width,
          height: height
       });
      return image_id;
    }
    else
    {
      // uploading a new version of an existing file, just update "created_at"
      var image_id = Images.findOne({key:key}, {fields: {_id:1}});
      Images.update({_id: image_id}, {$set:
        {
          created_at: moment().valueOf()
        }});
    }
  },
  make_preview: function(image_id) {
    check(image_id, NonEmptyString);

    // Does the user have permission to remove this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove an image you uploaded");

    if (image.role == "preview")
      return true;

    else
    {
      var pattern_id = image.used_by;
      try {
        var current_preview_id = Images.findOne({used_by:pattern_id, role:"preview"})._id; // remove any existing preview image
        Images.update({_id:current_preview_id}, {$set: {role:"image"}});
      }
      catch(err) {
        // no existing preview, nothing to do here
      }

      Images.update({_id:image_id}, {$set: {role:"preview"}});
    }
  },
  set_image_dimensions: function(image_id, width, height) {
    check(image_id, NonEmptyString);
    check(width, Number);
    check(height, Number);

    // Does the user have permission to edit this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only edit an image you uploaded");

    // landscape or portrait

    // constrain size

    var new_width = width;
    var new_height = height;

    Images.update({_id: image_id}, {$set: {width: new_width, height: new_height}});

  },
  remove_image: function(image_id) {
    check(image_id, NonEmptyString);

    // Does the user have permission to remove this image?
    var image = Images.findOne({ '_id': image_id });

    if (typeof image === "undefined")
      throw new Meteor.Error("not-found", "Image not found: " + image_id);

    if (image.created_by != Meteor.userId())
      throw new Meteor.Error("not-authorized", "You can only remove an image you uploaded");

    // check for too many image removals too fast
    var document_id = Meteor.call('get_actions_log');

    var db_document = ActionsLog.findOne({_id: document_id}, {fields: { image_removed: 1, locked: 1 }} );

    var event_log = db_document.image_removed;

    if (db_document.locked)
    throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
  
    var number_of_entries = event_log.length;
    var time_since_last_action = moment().valueOf() - event_log[0];

    // try to detect automated image removes
    // A human shouldn't be able to removes 10 images in 2 seconds
    var last_10_actions_in = event_log[0] - event_log[9];
    if (last_10_actions_in < 2000)
    {
      ActionsLog.update( {_id: document_id}, { locked: true } );
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    }

    var last_5_actions_in = event_log[0] - event_log[4];
      if (last_5_actions_in < 2000)
      {
        // Don't allow another attempt for 5 minutes
        if (time_since_last_action < (60 * 1000 * 5))
          throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");

        // it's been at least 5 mins so consider allowing another image upload
        else
        {
          var previous_5_actions_in = event_log[4] - event_log[9];
          if (previous_5_actions_in < 2000)
          {
            // if the 5 previous actions were in 2 seconds, wait 30 minutes
            // this looks like an automatic process that has tried continually
            if (time_since_last_action < (60 * 1000 * 30 + 4000))
              throw new Meteor.Error("too-many-requests", "Please wait 30 mins before retrying");
          }
        }
      }

      // record the action in the log
      ActionsLog.update( {_id: document_id}, { $push: { image_removed: {
        $each: [moment().valueOf()],
        $position: 0 
      }}} );
  ;
      // remove the oldest log entry if too many stored
      if (number_of_entries > Meteor.settings.private.image_remove_num_to_log)
      {
        ActionsLog.update( {_id: document_id}, { $pop: { image_removed: 1 }} );
      }

    var s3 = new AWS.S3({
      accessKeyId: Meteor.settings.private.AWSAccessKeyId,
      secretAccessKey: Meteor.settings.private.AWSSecretAccessKey//,
    });

    var params = {
      Bucket: Meteor.settings.private.AWSBucket, // 'mybucket'
      Key: image.key // 'images/myimage.jpg'
    };
    
    s3.deleteObject(params, Meteor.bindEnvironment(function (error, data){
      if (!error) {
        var new_preview_needed = false;
        if (image.role == "preview")
        {
          new_preview_needed = true;
          var pattern_id = image.used_by;
        }

        Images.remove({_id: image_id});

        if (new_preview_needed)
        {
          var new_preview_id = Images.findOne({used_by:pattern_id})._id;
          Meteor.call("make_preview", new_preview_id);
        }
      }
    }));
  },
  ///////////////////////////////
  // Edit pattern properties
  update_text_property: function(collection, object_id, property, value)
  {
    // used by the editable_field template
    // this function updates specified text properties of specified collections. It deliberately checks for known collections and properties to avoid unexpected database changes.
    check(object_id, NonEmptyString);
    check(collection, NonEmptyString);
    check(property, NonEmptyString);
    check(value, String);

    if (value.length > 3000)
      throw new Meteor.Error("not-authorized", "Value is too long");

    if (collection == "patterns")
    {
      var pattern = Patterns.findOne({_id: object_id}, { fields: {created_by: 1}});

      if (pattern.created_by != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only update patterns you created");

      switch (property)
      {
        case "name":
        case "description":
        case "weaving_notes":
        case "threading_notes":
          if ((property == "name") && (value == ""))
            return; // pattern must have a name

          var update = {};
          update[property] = value; // this construction is necessary to handle a variable property name
          Patterns.update({_id: object_id}, {$set: update});
          
          // Record the edit time
          Meteor.call("save_text_edit_time", object_id);
          return;

          default:
            throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }

    if (collection == "images")
    {
      var image = Images.findOne({_id: object_id});
      var pattern = Patterns.findOne({_id: image.used_by})

      if (pattern.created_by != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only update patterns you created");
      // *** TODO check user can edit pattern
      switch (property)
      {
        case "caption":
          //console.log("edit caption ");
          var update = {};
          update[property] = value; // this construction is necessary to handle a variable property name
          Images.update({_id: object_id}, {$set: update});
          return;

        default:
          throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }

    if (collection == "users")
    {
      // only the user can update their own profile
      if (object_id != Meteor.userId())
        throw new Meteor.Error("not-authorized", "You can only change your own user details");

      switch (property)
      {
        case "description":
          // correct for me having messed up profiles by setting them as a text string not knowing it already existed
          // profile is an object to which editable properties may be added
          var profile = Meteor.users.findOne({ _id: object_id}).profile;
          if (typeof profile === "undefined")
            profile = {};
          
          profile[property] = value;

          Meteor.users.update({_id: object_id}, {$set: {profile: profile}});
          return;

        case "email_address":
          if (value == "")
            return;

          var old_emails = Meteor.users.findOne({ _id: object_id}).emails;
          if (old_emails) // user may have no emails
            var start_number = old_emails.length;
          else
            var start_number = 0;

          Accounts.addEmail(object_id, value); // I believe this runs synchronously because it is being called on the server

          // If addEmail doesn't throw an error, we can assume that either the new email was added, or it replaced one that was identical apart from case - in the latter case, verification status is unchanged. So the user should have an email address.
          var new_emails = Meteor.users.findOne({ _id: object_id}).emails;
          if (new_emails)
            var end_number = new_emails.length;
          else
            var end_number = 0;

          if (end_number > start_number) // email was successfully added
          {
            // remove any other email addresses - user should only have one.
            for (var i=0; i<new_emails.length; i++)
            {
              if (new_emails[i].address != value)
                Accounts.removeEmail(object_id, new_emails[i].address);
            }
            //Accounts.sendVerificationEmail(object_id);
            Meteor.call('sendVerificationEmail', object_id);
          }

          return;

        default:
          throw new Meteor.Error("not-authorized", "Unknown property");
      }
    }
  },
  save_text_edit_time: function(pattern_id)
  {
    check(pattern_id, String);
    Patterns.update({_id: pattern_id}, {$set: {text_edited_at: moment().valueOf()}});
  },

  ///////////////////////////////
  // user account management
  sendVerificationEmail(userId, email)
  {
    check(userId, NonEmptyString);
    check(email, Match.Optional(String));

    if (userId != Meteor.userId())
      // Only the owner can request a verification email
      throw new Meteor.Error("not-authorized", "You can only request verification emails for your own email addresses");

    // check for the user having requested too many emails in too short a time
    var document_id = Meteor.call('get_actions_log');

    var db_document = ActionsLog.findOne({_id: document_id}, {fields: { verification_email_sent: 1, locked: 1 }} );

    var event_log = db_document.verification_email_sent;

    if (db_document.locked)
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    
    var number_of_entries = event_log.length;
    var time_since_last_action = moment().valueOf() - event_log[0];
    
    // try to detect automated email send
    // If the last 5 actions in a space of 1 second
    var last_5_actions_in = event_log[0] - event_log[4];
    if (last_5_actions_in < 2000)
    {
      // Don't allow another attempt for 5 minutes
      if (time_since_last_action < (60 * 1000 * 5))
        throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");

      // it's been at least 5 mins so consider allowing another email
      else
      {
        var last_10_actions_in = event_log[0] - event_log[9];
        if (last_10_actions_in < (60 * 1000 * 5))
        {
          // if the last 10 actions in 5 minutes 4 seconds, wait 30 minutes
          // this looks like an automatic process that has tried continually
          if (time_since_last_action < (60 * 1000 * 30 + 4000))
            throw new Meteor.Error("too-many-requests", "Please wait 30 mins before retrying");
        }
      }
    }

    // try to prevent sending too many emails if the user hits the button repeatedly
    // If the last 3 actions in a space of 1 minute, wait 5 minutes
    var last_3_actions_in = event_log[0] - event_log[2];
    if (last_3_actions_in < 60000)
    {
      // Don't allow another attempt for 5 minutes
      if (time_since_last_action < (60 * 1000 * 5))
        throw new Meteor.Error("too-many-requests", "Please wait 5 mins before retrying");
    }

    // Lock the user's account if 20 emails requested in 30 minutes
    var last_20_actions_in = event_log[0] - event_log[29];
    if (last_20_actions_in < 60 * 1000 * 30)
    {
      ActionsLog.update( {_id: document_id}, { locked: true } );
      throw new Meteor.Error("account-locked", "Your account has been locked, please contact an administrator");
    }

    // send the email
    // record the action in the log
    ActionsLog.update( {_id: document_id}, { $push: { verification_email_sent: {
      $each: [moment().valueOf()],
      $position: 0 
    }}} );

    // remove the oldest log entry if too many stored
    if (number_of_entries > Meteor.settings.private.verification_emails_num_to_log)
        ActionsLog.update( {_id: document_id}, { $pop: { verification_email_sent: 1 }} );

    if (typeof email !== "string")
      Accounts.sendVerificationEmail(Meteor.userId(), email);

    else
      Accounts.sendVerificationEmail(Meteor.userId());
  },
  // make sure the user has the correct role depending on whether their email address is verified
  update_user_roles(id)
  {
    check(id, String);

    if (Meteor.users.find({_id: id}).count() == 0)
      throw new Meteor.Error("not-found", "User width id " + id + "not found");
    var user = Meteor.users.findOne({_id: id});

    try {
      if (user.emails[0].verified)
      {
        Roles.addUsersToRoles(id, ['verified'], 'users');
      }
      else
      {
        Roles.removeUsersFromRoles(id, ['verified'], 'users');
      }
    }
    catch(err) {

    }
  },
  // return the action log for the current user
  // add a blank if none exists
  get_actions_log()
  {
    if (ActionsLog.find( {user_id: Meteor.userId()} ).count() == 0)
      return ActionsLog.insert({
        user_id: Meteor.userId(),
        username: Meteor.user().username,
        verification_email_sent: [],
        image_uploaded: [],
        image_removed: []
      });
    
    else
      return ActionsLog.findOne( {user_id: Meteor.userId()} )._id;
  },
  ///////////////////////////////
  // IMPORTANT!! Only works if "debug"
  // Meteor.call("debug_validate_email", Meteor.userId(), true)
  debug_validate_email(user_id, validated)
  {
    if (!Meteor.settings.private.debug)
      return;

    if (validated === false)
    {
      Meteor.users.update(user_id, {$set: {"emails.0.verified" :false}});
    }
    else
    {
      Meteor.users.update(user_id, {$set: {"emails.0.verified" :true}});
    }
  }
});
