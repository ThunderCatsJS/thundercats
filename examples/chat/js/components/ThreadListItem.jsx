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
import classNames from 'classnames';

export default class ThreadListItem extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.chatActions = this.context.cat.getActions('chatActions');
  }
  static displayName = 'ThreadListItem'

  static contextTypes = {
    cat: PropTypes.object.isRequired
  }

  static propTypes = {
    currentThreadID: PropTypes.string,
    thread: PropTypes.object
  }

  handleClick() {
    this.chatActions.clickThread(this.props.thread.id);
  }

  render() {
    const { thread, currentThreadID } = this.props;
    const { date, text } = thread.lastMessage;
    const itemClassName = classNames({
      'thread-list-item': true,
      'active': thread.id === currentThreadID
    });

    return (
      <li
        className={ itemClassName }
        onClick={ this.handleClick.bind(this) }>
        <h5 className='thread-name'>
          { thread && thread.name }
        </h5>
        <div className='thread-time'>
          { date.toLocaleTimeString() }
        </div>
        <div className='thread-last-message'>
          { text }
        </div>
      </li>
    );
  }
}
