require('babel/register')({
  auxiliaryComment: 'istanbul ignore next',
  optional: [
    'es7.classProperties'
  ]
});
