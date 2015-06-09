/**
 * This file is provided by Facebook for testing and evaluation purposes
 * only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
 * AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from 'react';

const ENTER_KEY_CODE = 13;

export default class MessageComposer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { text: '' };
  }

  static displayName = 'MessageComposer'
  static propTypes: {
    thread: React.PropTypes.object
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleKeyDown(e) {
    const { chatActions } = this.props;
    if (e.keyCode === ENTER_KEY_CODE) {
      e.preventDefault();
      var text = this.state.text.trim();
      if (text) {
        chatActions.createMessage({
          text,
          threadID: this.props.thread.id
        });
      }
      this.setState({ text: '' });
    }
  }

  render() {
    return (
      <textarea
        className='message-composer'
        name='message'
        onChange={ this.handleChange.bind(this) }
        onKeyDown={ this.handleKeyDown.bind(this) }
        value={ this.state.text } />
    );
  }
}
