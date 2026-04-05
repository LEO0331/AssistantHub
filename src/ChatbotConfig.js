import { createChatBotMessage } from 'react-chatbot-kit';

const botName = 'AssistantBot';

const config = {
  botName,
  initialMessages: [createChatBotMessage(`Hi! I'm ${botName}. How can I assist you today?`)],
  customStyles: {
    botMessageBox: {
      backgroundColor: '#30302e',
    },
    chatButton: {
      backgroundColor: '#c96442',
    },
  },
};

export default config;
