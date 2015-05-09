import { Actions } from 'thundercats';
import messageServices from '../services/messages';

export default class CompActions extends Actions {
  constructor() {
    super([
      'clickThread',
      'receiveRawMessages'
    ]);
  }

  static displayName = 'CompActions'

  createMessage(data) {
    const text = data.text;
    const threadID = data.threadID;

    const timestamp = Date.now();
    const message = {
      id: 'm_' + timestamp,
      threadID: threadID,
      // hard coded for the example
      authorName: 'Bill',
      date: new Date(timestamp),
      text: text,
      isRead: true
    };

    return {
      message: message,
      observable: messageServices.createMessage(message)
    };
  }
}
