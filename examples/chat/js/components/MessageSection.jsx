/**
 * This file is provided by Facebook for testing and evaluation purposes
 * only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
 * AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { PropTypes } from 'react';
import { createContainer } from 'thundercats';
import messageServices from '../services/messages';
import MessageComposer from './MessageComposer.jsx';
import MessageListItem from './MessageListItem.jsx';

function combineLatest(messages, { currentID, threads }) {
  const threadMessages = [];
  Object.keys(messages).forEach(id => {
    if (messages[id].threadID === currentID) {
      threadMessages.push(messages[id]);
    }
  });

  threadMessages.sort((a, b) => {
    if (a.date < b.date) {
      return -1;
    } else if (a.date > b.date) {
      return 1;
    }
    return 0;
  });

  return {
    thread: threads[currentID] || {},
    messages: threadMessages
  };
}

@createContainer({
  actions: ['chatActions'],
  stores: [
    'messageStore',
    'threadStore'
  ],
  combineLatest: combineLatest
})
export default class MessageSection extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'MessageSection'
  static propTypes = {
    chatActions: PropTypes.object.isRequired,
    messages: PropTypes.array,
    thread: PropTypes.object
  }

  componentDidMount() {
    const { chatActions } = this.props;
    this.scrollToBottom();
    messageServices.getAllMessages()
      .firstOrDefault()
      .subscribe(rawMessages => {
        chatActions.receiveRawMessages(rawMessages);
      });
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    const ul = this.refs.messageList.getDOMNode();
    ul.scrollTop = ul.scrollHeight;
  }

  renderMessages(messages) {
    return messages.map(message => (
      <MessageListItem
        key={ message.id }
        message={ message }/>
    ));
  }

  render() {
    const { messages, thread } = this.props;

    return (
      <div className='message-section'>
        <h3 className='message-thread-heading'>
          { thread.name }
        </h3>
        <ul
          className='message-list'
          ref='messageList'>
          { this.renderMessages(messages) }
        </ul>
        <MessageComposer
          chatActions={ this.props.chatActions }
          thread={ thread }/>
      </div>
    );
  }
}
