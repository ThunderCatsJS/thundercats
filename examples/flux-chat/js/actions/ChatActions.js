var Action = require('thundercats').Action;
var ChatWebAPIUtils = require('../utils/ChatWebAPIUtils');

var createMessage = Action.create(function(data) {
  var text = data.text;
  var threadID = data.threadID;

  var timestamp = Date.now();
  var message = {
    id: 'm_' + timestamp,
    threadID: threadID,
    // hard coded for the example
    authorName: 'Bill',
    date: new Date(timestamp),
    text: text,
    isRead: true
  };
  var promise = ChatWebAPIUtils.createMessage(message);

  return {
    message: message,
    promise: promise
  };
});

var receiveRawMessages = Action.create();
var clickThread = Action.create();


exports.createMessage = createMessage;
exports.receiveRawMessages = receiveRawMessages;
exports.clickThread = clickThread;
