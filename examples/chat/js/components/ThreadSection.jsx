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

import ThreadListItem from '../components/ThreadListItem.jsx';
import ChatMessageUtils from '../utils/ChatMessageUtils';

function getUnreadCount(threads) {
  let unreadCount = 0;
  Object.keys(threads).forEach(id => {
    if (!threads[id].lastMessage.isRead) {
      unreadCount++;
    }
  });
  return unreadCount;
}

@createContainer({
  store: 'threadStore',
  map: ({ threads, currentID }) => ({
    currentID,
    threads: ChatMessageUtils.getAllChrono(threads),
    unreadCount: getUnreadCount(threads)
  })
})
export default class ThreadSection extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'ThreadSection'
  static propTypes = {
    currentID: PropTypes.string,
    threads: PropTypes.array,
    unreadCount: PropTypes.number
  }

  renderUnread(unread) {
    return unread === 0 ?
      null :
      <span>Unread threads: { unread }</span>;
  }

  renderListItems(currentID, threads) {
    if (!threads) {
      return null;
    }
    return threads.map(thread => (
      <ThreadListItem
        currentThreadID={ currentID }
        key={ thread.id }
        thread={ thread } />
    ));
  }

  render() {
    const { currentID, threads, unreadCount } = this.props;
    return (
      <div className='thread-section'>
        <div className='thread-count'>
          { this.renderUnread(unreadCount) }
        </div>
        <ul className='thread-list'>
          { this.renderListItems(currentID, threads) }
        </ul>
      </div>
    );
  }
}
