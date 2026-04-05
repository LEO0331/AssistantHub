export const SORT_OPTIONS = {
  HIGH_TO_LOW: 'highToLow',
  LOW_TO_HIGH: 'lowToHigh',
};

export const RATE_FILTERS = {
  ALL: 'all',
  UNDER_40: 'under40',
  BETWEEN_40_60: '40to60',
  OVER_60: 'over60',
};

export const initialUiState = {
  searchTerm: '',
  sortOrder: SORT_OPTIONS.HIGH_TO_LOW,
  selectedRole: 'all',
  selectedAvailability: 'all',
  selectedRate: RATE_FILTERS.ALL,
  isAddedModalOpen: false,
  isInquiryModalOpen: false,
  isChatbotVisible: false,
  isDrawerOpen: false,
  isLoading: false,
  selectedTalentId: null,
};

export const uiReducer = (state, action) => {
  switch (action.type) {
    case 'setSearch':
      return { ...state, searchTerm: action.payload };
    case 'setSort':
      return { ...state, sortOrder: action.payload };
    case 'setRoleFilter':
      return { ...state, selectedRole: action.payload };
    case 'setAvailabilityFilter':
      return { ...state, selectedAvailability: action.payload };
    case 'setRateFilter':
      return { ...state, selectedRate: action.payload };
    case 'toggleAddedModal':
      return { ...state, isAddedModalOpen: !state.isAddedModalOpen };
    case 'toggleInquiryModal':
      return { ...state, isInquiryModalOpen: !state.isInquiryModalOpen };
    case 'toggleChatbot':
      return { ...state, isChatbotVisible: !state.isChatbotVisible };
    case 'setLoading':
      return { ...state, isLoading: action.payload };
    case 'openDrawer':
      return { ...state, isDrawerOpen: true, selectedTalentId: action.payload };
    case 'closeDrawer':
      return { ...state, isDrawerOpen: false, selectedTalentId: null };
    default:
      return state;
  }
};
