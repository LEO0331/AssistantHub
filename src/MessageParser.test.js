/* eslint-disable no-undef */
import MessageParser from './MessageParser';

describe('MessageParser', () => {
  const actionProvider = {
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
  };

  beforeEach(() => {
    Object.values(actionProvider).forEach((fn) => fn.mockClear());
  });

  test('routes greeting intents', () => {
    const parser = new MessageParser(actionProvider);
    parser.parse('hello there');

    expect(actionProvider.greet).toHaveBeenCalledTimes(1);
  });

  test('routes card info intents', () => {
    const parser = new MessageParser(actionProvider);
    parser.parse('show email and phone details');

    expect(actionProvider.handleCardInfo).toHaveBeenCalledTimes(1);
  });

  test('routes unknown intents to default', () => {
    const parser = new MessageParser(actionProvider);
    parser.parse('random unrelated words');

    expect(actionProvider.default).toHaveBeenCalledTimes(1);
  });
});
