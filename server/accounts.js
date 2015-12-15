Meteor.startup(function () {
  ////////////////////////
  // TODO remove this code after running it once on the live site
  // fixes my mistake with user profiles
  // http://stackoverflow.com/questions/12956438/accessing-mongodb-collection-values-in-javascript
  /*Meteor.users.find().forEach(function(user){
    number = Patterns.find({created_by: user._id}).count();

    if (typeof user.profile === "string")
    {
      var description = user.profile;
      var profile = {};
      profile.description = description;
      Meteor.users.update({_id: user._id}, {$set: {profile: profile}});
    }
  })*/

  // move pattern data into Patterns collection so each cell isn't an individual document
  // TODO remove Weaving etc. collections, delete publish functions
  // TODO remove this after it has run, it only needs to run once
  // TODO when reading Patterns, specify which fields to see, don't load weaving etc. unless required e.g. on home page
  // TODO migrate threading, and maybe styles

    /*Weaving.remove({}); // This absolutely must only be run once! And only after the data have been safely migrated.

  Threading.remove({}); // This absolutely must only be run once! And only after the data have been safely migrated.

    Orientation.remove({}); // This absolutely must only be run once! And only after the data have been safely migrated.

    Styles.remove({}); // This absolutely must only be run once! And only after the data have been safely migrated.

    // Then remove all refs in code to these collections
    */

  //var weaving = new Object(); // todo define inside loop
  // Migrate weaving data to Patterns collection
  Patterns.find().forEach(function(pattern){
    console.log("migrating weaving data for pattern " + pattern.name);
    //if (typeof pattern.weaving !== "object")
    //{
      var number_of_rows = pattern.number_of_rows;
      var number_of_tablets = pattern.number_of_tablets;
      
      console.log("rows " + number_of_rows);
      console.log("tablets " + number_of_tablets);
      console.log("number of cells " + Weaving.find({ pattern_id: pattern._id}).count());

      if (Weaving.find({ pattern_id: pattern._id}).count() > 0)
      {
        var weaving = new Array(number_of_rows);

        for (var i=0; i<number_of_rows; i++)
        {
          weaving[i] = new Array(number_of_tablets);
        }

        Weaving.find({ pattern_id: pattern._id}).forEach(function(cell)
        {
          if((cell.row > number_of_rows) || (cell.row < 1))
          {
            console.log("!!problem weaving row !! " + cell.row);
          }
          else if((cell.tablet > number_of_tablets) || (cell.tablet < 1))
          {
            console.log("!!problem weaving tablet !! "+ cell.row + ", " + cell.tablet);
          }
          else if (typeof weaving[parseInt(cell.row)-1] === "undefined")
          {
            console.log("no row at " + cell.row);
          }
          else
          {
            //console.log("try weaving row " + cell.row + ", " + cell.tablet);
            weaving[parseInt(cell.row)-1][parseInt(cell.tablet)-1] = cell.style;
          }
            
        });

        //console.log("weaving " + JSON.stringify(weaving));
        Patterns.update({_id: pattern._id}, {$set: {weaving: JSON.stringify(weaving)}});
        Patterns.update({_id: pattern._id}, {$set: {private: false}}); // TODO remove this
      }
        
      // Threading
      var threading = new Array(4);

      for (var i=0; i<4; i++)
      {
        threading[i] = new Array(number_of_tablets);
      }

      Threading.find({ pattern_id: pattern._id}).forEach(function(cell)
      {
        //console.log("got threading cell " + cell.hole + ", " + cell.tablet + ", " + cell.style);
        if((cell.hole > 4) || (cell.hole < 1))
        {
          console.log("!!problem threading hole !! " + cell.hole);
        }
        else if((cell.tablet > number_of_tablets) || (cell.tablet < 1))
        {
          console.log("!!problem threading tablet !! "+ cell.hole + ", " + cell.tablet);
        }
        else
        {
          if (typeof threading[parseInt(cell.hole)-1] === "undefined")
          {
            console.log("undefined hole at " + parseInt(cell.hole)-1);
          }
          else
          {
//console.log("give threading a try");
            threading[parseInt(cell.hole)-1][parseInt(cell.tablet)-1] = cell.style;
          }
        }

      });
      //console.log("threading " + JSON.stringify(threading));
      Patterns.update({_id: pattern._id}, {$set: {threading: JSON.stringify(threading)}});

      // orientation
      var orientation = new Array(number_of_tablets);


      Orientation.find({ pattern_id: pattern._id}).forEach(function(cell)
      {
        if((cell.tablet > number_of_tablets) || (cell.tablet < 1))
        {
          console.log("!!problem orientation tablet !! " + cell.tablet);
        }
        else
        {
          orientation[parseInt(cell.tablet)-1] = cell.orientation;
        }
        
      });

      //console.log("orientation " + JSON.stringify(orientation));
      Patterns.update({_id: pattern._id}, {$set: {orientation: JSON.stringify(orientation)}});

      console.log("converting styles");

      var styles = new Array(32);

      Styles.find({ pattern_id: pattern._id}).forEach(function(style)
      {
        if((style.style > 32) || (style.style < 1))
        {
          console.log("!!problem style tablet !! " + style.style);
        }
        else
        {
          styles[parseInt(style.style)-1] = style;
        }
        
      });

      //console.log("orientation " + JSON.stringify(orientation));
      Patterns.update({_id: pattern._id}, {$set: {styles: JSON.stringify(styles)}});

  });


  Accounts.config({
    sendVerificationEmail: true 
  });

  Accounts.emailTemplates.siteName = "Twisted Threads";
  Accounts.emailTemplates.from = "Twisted Threads <no-reply@twisted-threads.com>";
  Accounts.emailTemplates.verifyEmail.subject = function (user) {
      return "Verify your email address";
  };
  Accounts.emailTemplates.verifyEmail.text = function (user, url) {
     return "Hello " + user.username
       + ",\n\nYou have registered a new email address on Twisted Threads, the online app for tablet weaving. To verify your email address, please click the link below:\n\n"
       + url;
  };
});
