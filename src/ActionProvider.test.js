/* eslint-disable no-undef */
import ActionProvider from './ActionProvider';

describe('ActionProvider', () => {
  const createChatBotMessage = jest.fn((text) => ({ text }));
  const createClientMessage = jest.fn((text) => ({ text }));

  const setupProvider = () => {
    let state = { messages: [] };
    const setState = (updater) => {
      state = updater(state);
    };

    const provider = new ActionProvider(createChatBotMessage, setState, createClientMessage);
    return { provider, getState: () => state };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('greet appends a greeting message', () => {
    const { provider, getState } = setupProvider();

    provider.greet();

    expect(createChatBotMessage).toHaveBeenCalledWith('Hello! How can I help you?');
    expect(getState().messages).toHaveLength(1);
  });

  test('default appends fallback message', () => {
    const { provider, getState } = setupProvider();

    provider.default();

    expect(createChatBotMessage).toHaveBeenCalledWith(
      "I'm not sure how to respond to that. Can you please rephrase?"
    );
    expect(getState().messages).toHaveLength(1);
  });
});
