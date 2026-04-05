/* eslint-disable no-undef */
import ActionProvider from './ActionProvider';

const buildHarness = () => {
  const createChatBotMessage = jest.fn((text) => ({ text }));
  let state = { messages: [] };
  const setState = (updater) => {
    state = updater(state);
  };

  const provider = new ActionProvider(createChatBotMessage, setState, jest.fn());
  return { provider, createChatBotMessage, getState: () => state };
};

describe('ActionProvider', () => {
  const scenarios = [
    ['greet', 'Hello! How can I help you?'],
    ['handleButton', 'Click on the button allows you to add or remove a new assistant card.'],
    ['handleAddButton', "The 'Add' button allows you to add a new assistant card."],
    ['handleMinusButton', "The 'Minus' button removes the last assistant card."],
    ['handleSearchBar', "The search bar filters the assistant cards by name."],
    ['handleSortDropdown', 'The sort dropdown allows you to sort cards by likes, either high to low or low to high.'],
    [
      'handleCardInfo',
      "Each card shows the assistant's name, QR code, likes, location, and contact details. You can click on the email or phone to copy them to the clipboard.",
    ],
    ['handleInquiry', 'The view inquiry sent button allows you to view inquiries sent to each assistant.'],
    ['handleView', 'The view added info button allows you to view all added information of assistants.'],
    ['handleExport', 'The export added info button allows you to export all added information of assistants to CSV file.'],
    ['default', "I'm not sure how to respond to that. Can you please rephrase?"],
  ];

  test.each(scenarios)('%s appends correct chatbot message', (method, expectedText) => {
    const { provider, createChatBotMessage, getState } = buildHarness();

    provider[method]();

    expect(createChatBotMessage).toHaveBeenCalledWith(expectedText);
    expect(getState().messages).toEqual([{ text: expectedText }]);
  });

  test('updateChatbotState appends without removing previous messages', () => {
    const { provider, getState } = buildHarness();
    provider.updateChatbotState({ text: 'first' });
    provider.updateChatbotState({ text: 'second' });

    expect(getState().messages).toEqual([{ text: 'first' }, { text: 'second' }]);
  });
});
