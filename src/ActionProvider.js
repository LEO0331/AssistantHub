class ActionProvider {
    constructor(createChatBotMessage, setStateFunc, createClientMessage) {
      this.createChatBotMessage = createChatBotMessage;
      this.setState = setStateFunc;
      this.createClientMessage = createClientMessage;
    }
  
    greet() {
      const greetingMessage = this.createChatBotMessage("Hello! How can I help you?");
      this.updateChatbotState(greetingMessage);
    }

    handleButton() {
      const message = this.createChatBotMessage("Click on the button allows you to add or remove a new assistant card.");
      this.updateChatbotState(message);
    }

    handleAddButton() {
      const message = this.createChatBotMessage("The 'Add' button allows you to add a new assistant card.");
      this.updateChatbotState(message);
    }
  
    handleMinusButton() {
      const message = this.createChatBotMessage("The 'Minus' button removes the last assistant card.");
      this.updateChatbotState(message);
    }
  
    handleSearchBar() {
      const message = this.createChatBotMessage("The search bar filters the assistant cards by name.");
      this.updateChatbotState(message);
    }
  
    handleSortDropdown() {
      const message = this.createChatBotMessage("The sort dropdown allows you to sort cards by likes, either high to low or low to high.");
      this.updateChatbotState(message);
    }
  
    handleCardInfo() {
      const message = this.createChatBotMessage("Each card shows the assistant's name, QR code, likes, location, and contact details. You can click on the email or phone to copy them to the clipboard.");
      this.updateChatbotState(message);
    }
  
    handleInquiry() {
      const message = this.createChatBotMessage("The view inquiry sent button allows you to view inquiries sent to each assistant.");
      this.updateChatbotState(message);
    }

    handleView() {
      const message = this.createChatBotMessage("The view added info button allows you to view all added information of assistants.");
      this.updateChatbotState(message);
    }

    handleExport() {
      const message = this.createChatBotMessage("The export added info button allows you to export all added information of assistants to CSV file.");
      this.updateChatbotState(message);
    }

    default() {
      const defaultMessage = this.createChatBotMessage("I'm not sure how to respond to that. Can you please rephrase?");
      this.updateChatbotState(defaultMessage);
    }
  
    updateChatbotState(message) {
      this.setState(prevState => ({
        ...prevState,
        messages: [...prevState.messages, message],
      }));
    }
  }
  
  export default ActionProvider;
  