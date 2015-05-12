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
import { Store } from 'thundercats';
import assign from 'object-assign';
import ChatMessageUtils from '../utils/ChatMessageUtils';

function markAllInThreadRead(messages, threadID) {
  return Object.keys(messages).reduce(function (result, id) {
    result[id] = messages[id].threadID === threadID ?
      assign({}, messages[id], {isRead: true}) :
      messages[id];

    return result;
  }, {});
}

export default class MessageStore extends Store {
  constructor(cat) {
    super();
    const chatActions = cat.getActions('chatActions');
    const threadStore = cat.getStore('threadStore');

    const {
      clickThread,
      createMessage,
      receiveRawMessages
    } = chatActions;

    this.value = {};

    this.register(
      clickThread.withLatestFrom(
        threadStore,
        (e, { currentID }) => currentID
      )
      .map(currentID => ({
        transform: messages => markAllInThreadRead(messages, currentID)
      }))
    );

    this.register(createMessage.map(({ message, observable }) => {
      return {
        transform: messages => {
          const newMessages = assign({}, messages);
          newMessages[message.id] = message;
          return newMessages;
        },
        optimistic: observable
      };
    }));

    this.register(
      receiveRawMessages
        .withLatestFrom(threadStore, (rawMessages, { currentID }) => ({
          rawMessages,
          currentID
        }))
        .map(({ rawMessages, currentID }) => ({
          transform: messages => {
            const newMessages = assign({}, messages);

            rawMessages.forEach(message => {
              if (!newMessages[message.id]) {
                newMessages[message.id] =
                  ChatMessageUtils.convertRawMessage(
                    message,
                    currentID
                );
              }
            });

            return markAllInThreadRead(newMessages, currentID);
          }
        }))
    );
  }

  static displayName = 'MessageStore'
}
