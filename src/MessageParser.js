class MessageParser {
    constructor(actionProvider) {
      this.actionProvider = actionProvider;
    }
  
    parse(message) {
      const lowerCaseMessage = message.toLowerCase();
  
      if (lowerCaseMessage.includes("hello") || lowerCaseMessage.includes("hi")) {
        this.actionProvider.greet();
      } else if (lowerCaseMessage.includes("add button")) {
        this.actionProvider.handleAddButton();
      } else if (lowerCaseMessage.includes("minus button")) {
        this.actionProvider.handleMinusButton();
      } else if (lowerCaseMessage.includes("search bar")) {
        this.actionProvider.handleSearchBar();
      } else if (lowerCaseMessage.includes("sort")) {
        this.actionProvider.handleSortDropdown();
      } else if (
        lowerCaseMessage.includes("name") ||
        lowerCaseMessage.includes("qr code") ||
        lowerCaseMessage.includes("likes") ||
        lowerCaseMessage.includes("location") ||
        lowerCaseMessage.includes("email") ||
        lowerCaseMessage.includes("phone")
      ) {
        this.actionProvider.handleCardInfo();
      } else {
        this.actionProvider.default();
      }
    }
  }
  
  export default MessageParser;
  