class ActionProvider {
  constructor(createChatBotMessage, setStateFunc, createClientMessage) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
  }

  greet() {
    const greetingMessage = this.createChatBotMessage(
      'Hello! I can help with filters, seed/source, load sizes, shortlist flow, and import/export.'
    );
    this.updateChatbotState(greetingMessage);
  }

  handleButton() {
    const message = this.createChatBotMessage(
      "Use + / - to adjust pool size step-by-step, or quick-load buttons for 500, 2000, and 5000."
    );
    this.updateChatbotState(message);
  }

  handleAddButton() {
    const message = this.createChatBotMessage(
      "The '+' button increases pool size by 1 (or by 25 when the pool is above 100)."
    );
    this.updateChatbotState(message);
  }

  handleMinusButton() {
    const message = this.createChatBotMessage(
      "The '-' button decreases pool size by 1 (or by 25 when the pool is above 100)."
    );
    this.updateChatbotState(message);
  }

  handleSearchBar() {
    const message = this.createChatBotMessage(
      'Search is debounced and indexed for large pools. Combine it with role, availability, and rate chips.'
    );
    this.updateChatbotState(message);
  }

  handleSortDropdown() {
    const message = this.createChatBotMessage('Sort currently orders talent by likes: High to Low or Low to High.');
    this.updateChatbotState(message);
  }

  handleCardInfo() {
    const message = this.createChatBotMessage(
      "Each talent card includes role, availability, rate, skills, languages, likes, location map, QR/contact copy, and a detail drawer."
    );
    this.updateChatbotState(message);
  }

  handleInquiry() {
    const message = this.createChatBotMessage(
      'View Hiring Inquiries shows all submitted contact requests in one modal.'
    );
    this.updateChatbotState(message);
  }

  handleView() {
    const message = this.createChatBotMessage(
      'View Shortlist shows selected talent and lets you move hire status through New -> Contacted -> Interview -> Hired.'
    );
    this.updateChatbotState(message);
  }

  handleExport() {
    const message = this.createChatBotMessage(
      'Export supports CSV (shortlist) and JSON (seed, shortlist, inquiries). JSON import is schema-validated with a file-size cap.'
    );
    this.updateChatbotState(message);
  }

  handleSeed() {
    const message = this.createChatBotMessage(
      'Seed controls deterministic faker output. Same seed + same count reproduces the same talent pool.'
    );
    this.updateChatbotState(message);
  }

  handleDataSource() {
    const message = this.createChatBotMessage(
      'Data source can switch between Local generator and Mock API adapter to demo backend migration readiness.'
    );
    this.updateChatbotState(message);
  }

  handleMode() {
    const message = this.createChatBotMessage(
      'Use Card Mode for profile browsing and List Mode for high-volume virtualized table rendering.'
    );
    this.updateChatbotState(message);
  }

  handlePagination() {
    const message = this.createChatBotMessage(
      'Pagination controls are available in Card Mode: first/previous/next/last, per-page size, and jump-to-page.'
    );
    this.updateChatbotState(message);
  }

  handleReset() {
    const message = this.createChatBotMessage(
      'Reset Demo Data clears shortlist, inquiries, filters, seed/source, and returns the demo to defaults.'
    );
    this.updateChatbotState(message);
  }

  handleHelp() {
    const message = this.createChatBotMessage(
      'Quick demo path: set pool size, search/filter, shortlist talent, advance hire status, then export JSON/CSV.'
    );
    this.updateChatbotState(message);
  }

  default() {
    const defaultMessage = this.createChatBotMessage(
      'I can help with search/filter, shortlist/hire flow, seed/source, list mode, and import/export. Try one of those keywords.'
    );
    this.updateChatbotState(defaultMessage);
  }

  updateChatbotState(message) {
    this.setState((prevState) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  }
}

export default ActionProvider;
  
