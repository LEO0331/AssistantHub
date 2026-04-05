/* eslint-disable no-undef */
import MessageParser from './MessageParser';

const createActionProvider = () => ({
  greet: jest.fn(),
  handleButton: jest.fn(),
  handleAddButton: jest.fn(),
  handleMinusButton: jest.fn(),
  handleSearchBar: jest.fn(),
  handleSortDropdown: jest.fn(),
  handleInquiry: jest.fn(),
  handleView: jest.fn(),
  handleExport: jest.fn(),
  handleCardInfo: jest.fn(),
  default: jest.fn(),
});

describe('MessageParser', () => {
  let actionProvider;
  let parser;

  beforeEach(() => {
    actionProvider = createActionProvider();
    parser = new MessageParser(actionProvider);
  });

  const routeCases = [
    ['hello there', 'greet'],
    ['explain button usage', 'handleButton'],
    ['can you add one', 'handleAddButton'],
    ['minus card now', 'handleMinusButton'],
    ['search by name', 'handleSearchBar'],
    ['filter my list', 'handleSearchBar'],
    ['sort by likes', 'handleSortDropdown'],
    ['show inquiry', 'handleInquiry'],
    ['view shortlist', 'handleView'],
    ['export data', 'handleExport'],
    ['show email and phone', 'handleCardInfo'],
    ['where is location', 'handleCardInfo'],
  ];

  test.each(routeCases)('routes "%s" to %s', (message, targetMethod) => {
    parser.parse(message);
    expect(actionProvider[targetMethod]).toHaveBeenCalledTimes(1);
  });

  test('routes unknown message to default', () => {
    parser.parse('totally unrelated sentence');
    expect(actionProvider.default).toHaveBeenCalledTimes(1);
  });
});
