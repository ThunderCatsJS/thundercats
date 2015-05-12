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

import Rx from 'rx';
// !!! Please Note !!!
// We are using localStorage as an example, but in a real-world scenario, this
// would involve XMLHttpRequest, or perhaps a newer client-server protocol.
// The function signatures below might be similar to what you would build, but
// the contents of the functions are just trying to simulate client-server
// communication and server-side processing.

const NAMESPACE = 'thundercats-chat';

export default {
  getAllMessages: function() {
    // simulate retrieving data from a database
    const rawMessages = JSON.parse(localStorage.getItem(NAMESPACE));

    // simulate success callback
    return Rx.Observable.just(rawMessages).delay(50);
  },

  createMessage: function(message, threadName) {
    // simulate writing to a database
    const rawMessages = JSON.parse(localStorage.getItem(NAMESPACE));
    const timestamp = Date.now();
    const id = 'm_' + timestamp;
    const threadID = message.threadID || ('t_' + Date.now());
    const createdMessage = {
      id: id,
      threadID: threadID,
      threadName: threadName,
      authorName: message.authorName,
      text: message.text,
      timestamp: timestamp
    };
    rawMessages.push(createdMessage);
    localStorage.setItem(NAMESPACE, JSON.stringify(rawMessages));

    return Rx.Observable.just(createdMessage).delay(50);
  }
};
