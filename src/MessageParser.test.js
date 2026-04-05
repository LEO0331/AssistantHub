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
  handleSeed: jest.fn(),
  handleDataSource: jest.fn(),
  handleMode: jest.fn(),
  handlePagination: jest.fn(),
  handleReset: jest.fn(),
  handleHelp: jest.fn(),
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
    ['help me', 'handleHelp'],
    ['explain button usage', 'handleButton'],
    ['can you add one', 'handleAddButton'],
    ['minus card now', 'handleMinusButton'],
    ['search by name', 'handleSearchBar'],
    ['filter my list', 'handleSearchBar'],
    ['sort by likes', 'handleSortDropdown'],
    ['change seed', 'handleSeed'],
    ['switch source to mock api', 'handleDataSource'],
    ['open list mode', 'handleMode'],
    ['go to next page', 'handlePagination'],
    ['show inquiry', 'handleInquiry'],
    ['view shortlist', 'handleView'],
    ['export data', 'handleExport'],
    ['import demo file', 'handleExport'],
    ['reset everything', 'handleReset'],
    ['show email and phone', 'handleCardInfo'],
    ['show status', 'handleCardInfo'],
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
