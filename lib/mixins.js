////////////////////////
// extends 'check' functionality
// check(userId, NonEmptyString);
NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});
