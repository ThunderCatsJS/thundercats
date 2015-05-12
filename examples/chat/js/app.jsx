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
import { Cat } from 'thundercats';
import ChatApp from './components/ChatApp.jsx';
import ExampleData from './ChatExampleData';
import ChatActions from './actions/ChatActions';
import ThreadStore from './stores/ThreadStore';
import MessageStore from './stores/MessageStore';

ExampleData.init();

// This file bootstraps the entire application.
class Chat extends Cat {
  constructor() {
    super();
    this.register(ChatActions);
    this.register(ThreadStore, this);
    this.register(MessageStore, this);
  }
}

const chat = new Chat();

chat.render(
  <ChatApp />,
  document.getElementById('react')
).subscribe(
  () => {
    console.log('Chat app rendered');
  },
  err => {
    console.log('Chat app has err! Oh noes!!', err.message, err.stack);
  }
);
