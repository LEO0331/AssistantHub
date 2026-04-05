class MessageParser {
  constructor(actionProvider) {
    this.actionProvider = actionProvider;
  }

  parse(message) {
    const lowerCaseMessage = message.toLowerCase();
    const hasWord = (word) => new RegExp(`\\b${word}\\b`, 'i').test(lowerCaseMessage);

    if (hasWord('hello') || hasWord('hi')) {
      this.actionProvider.greet();
    } else if (hasWord('help') || hasWord('how')) {
      this.actionProvider.handleHelp();
    } else if (lowerCaseMessage.includes('button')) {
      this.actionProvider.handleButton();
    } else if (lowerCaseMessage.includes('add')) {
      this.actionProvider.handleAddButton();
    } else if (lowerCaseMessage.includes('minus') || lowerCaseMessage.includes('remove')) {
      this.actionProvider.handleMinusButton();
    } else if (lowerCaseMessage.includes('search') || lowerCaseMessage.includes('filter')) {
      this.actionProvider.handleSearchBar();
    } else if (lowerCaseMessage.includes('sort')) {
      this.actionProvider.handleSortDropdown();
    } else if (lowerCaseMessage.includes('seed')) {
      this.actionProvider.handleSeed();
    } else if (lowerCaseMessage.includes('source') || lowerCaseMessage.includes('mock api')) {
      this.actionProvider.handleDataSource();
    } else if (
      lowerCaseMessage.includes('list mode') ||
      lowerCaseMessage.includes('card mode') ||
      lowerCaseMessage.includes('table')
    ) {
      this.actionProvider.handleMode();
    } else if (
      lowerCaseMessage.includes('page') ||
      lowerCaseMessage.includes('pagination') ||
      lowerCaseMessage.includes('next') ||
      lowerCaseMessage.includes('previous')
    ) {
      this.actionProvider.handlePagination();
    } else if (lowerCaseMessage.includes('inquiry')) {
      this.actionProvider.handleInquiry();
    } else if (lowerCaseMessage.includes('view') || lowerCaseMessage.includes('shortlist')) {
      this.actionProvider.handleView();
    } else if (lowerCaseMessage.includes('export') || lowerCaseMessage.includes('import')) {
      this.actionProvider.handleExport();
    } else if (lowerCaseMessage.includes('reset')) {
      this.actionProvider.handleReset();
    } else if (
      lowerCaseMessage.includes('name') ||
      lowerCaseMessage.includes('qr') ||
      lowerCaseMessage.includes('code') ||
      lowerCaseMessage.includes('like') ||
      lowerCaseMessage.includes('likes') ||
      lowerCaseMessage.includes('location') ||
      lowerCaseMessage.includes('email') ||
      lowerCaseMessage.includes('phone') ||
      lowerCaseMessage.includes('status')
    ) {
      this.actionProvider.handleCardInfo();
    } else {
      this.actionProvider.default();
    }
  }
}

export default MessageParser;
  
