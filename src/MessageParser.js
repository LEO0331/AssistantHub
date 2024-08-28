class MessageParser {
    constructor(actionProvider) {
      this.actionProvider = actionProvider;
    }
  
    parse(message) {
      const lowerCaseMessage = message.toLowerCase();
  
      if (lowerCaseMessage.includes("hello") || lowerCaseMessage.includes("hi")) {
        this.actionProvider.greet();
      } else if (lowerCaseMessage.includes("button")) {
        this.actionProvider.handleButton();
      } else if (lowerCaseMessage.includes("add")) {
        this.actionProvider.handleAddButton();
      } else if (lowerCaseMessage.includes("minus")) {
        this.actionProvider.handleMinusButton();
      } else if (lowerCaseMessage.includes("search") || lowerCaseMessage.includes("filter")) {
        this.actionProvider.handleSearchBar();
      } else if (lowerCaseMessage.includes("sort")) {
        this.actionProvider.handleSortDropdown();
      } else if (lowerCaseMessage.includes("inquiry")) {
        this.actionProvider.handleInquiry();
      } else if (lowerCaseMessage.includes("view")) {
        this.actionProvider.handleView();
      } else if (lowerCaseMessage.includes("export")) {
        this.actionProvider.handleExport();
      } else if (
        lowerCaseMessage.includes("name") ||
        lowerCaseMessage.includes("qr") ||
        lowerCaseMessage.includes("code") ||
        lowerCaseMessage.includes("like") ||
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
  