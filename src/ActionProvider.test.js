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
    [
      'greet',
      'Hello! I can help with filters, seed/source, load sizes, shortlist flow, and import/export.',
    ],
    [
      'handleButton',
      'Use + / - to adjust pool size step-by-step, or quick-load buttons for 500, 2000, and 5000.',
    ],
    [
      'handleAddButton',
      "The '+' button increases pool size by 1 (or by 25 when the pool is above 100).",
    ],
    [
      'handleMinusButton',
      "The '-' button decreases pool size by 1 (or by 25 when the pool is above 100).",
    ],
    [
      'handleSearchBar',
      'Search is debounced and indexed for large pools. Combine it with role, availability, and rate chips.',
    ],
    ['handleSortDropdown', 'Sort currently orders talent by likes: High to Low or Low to High.'],
    [
      'handleCardInfo',
      'Each talent card includes role, availability, rate, skills, languages, likes, location map, QR/contact copy, and a detail drawer.',
    ],
    ['handleInquiry', 'View Hiring Inquiries shows all submitted contact requests in one modal.'],
    [
      'handleView',
      'View Shortlist shows selected talent and lets you move hire status through New -> Contacted -> Interview -> Hired.',
    ],
    [
      'handleExport',
      'Export supports CSV (shortlist) and JSON (seed, shortlist, inquiries). JSON import is schema-validated with a file-size cap.',
    ],
    [
      'handleSeed',
      'Seed controls deterministic faker output. Same seed + same count reproduces the same talent pool.',
    ],
    [
      'handleDataSource',
      'Data source can switch between Local generator and Mock API adapter to demo backend migration readiness.',
    ],
    [
      'handleMode',
      'Use Card Mode for profile browsing and List Mode for high-volume virtualized table rendering.',
    ],
    [
      'handlePagination',
      'Pagination controls are available in Card Mode: first/previous/next/last, per-page size, and jump-to-page.',
    ],
    [
      'handleReset',
      'Reset Demo Data clears shortlist, inquiries, filters, seed/source, and returns the demo to defaults.',
    ],
    [
      'handleHelp',
      'Quick demo path: set pool size, search/filter, shortlist talent, advance hire status, then export JSON/CSV.',
    ],
    [
      'default',
      'I can help with search/filter, shortlist/hire flow, seed/source, list mode, and import/export. Try one of those keywords.',
    ],
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
