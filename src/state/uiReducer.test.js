/* eslint-disable no-undef */
import {
  initialUiState,
  RATE_FILTERS,
  SORT_OPTIONS,
  uiReducer,
} from './uiReducer';

describe('uiReducer', () => {
  test('updates search and sort state', () => {
    const searched = uiReducer(initialUiState, { type: 'setSearch', payload: 'ops' });
    const sorted = uiReducer(searched, { type: 'setSort', payload: SORT_OPTIONS.LOW_TO_HIGH });

    expect(searched.searchTerm).toBe('ops');
    expect(sorted.sortOrder).toBe(SORT_OPTIONS.LOW_TO_HIGH);
  });

  test('updates filter chips', () => {
    const roleFiltered = uiReducer(initialUiState, { type: 'setRoleFilter', payload: 'Executive Assistant' });
    const availabilityFiltered = uiReducer(roleFiltered, {
      type: 'setAvailabilityFilter',
      payload: 'Available now',
    });
    const rateFiltered = uiReducer(availabilityFiltered, {
      type: 'setRateFilter',
      payload: RATE_FILTERS.OVER_60,
    });

    expect(rateFiltered.selectedRole).toBe('Executive Assistant');
    expect(rateFiltered.selectedAvailability).toBe('Available now');
    expect(rateFiltered.selectedRate).toBe(RATE_FILTERS.OVER_60);
  });

  test('toggles modal and drawer visibility state', () => {
    const modalOpen = uiReducer(initialUiState, { type: 'toggleAddedModal' });
    const inquiryOpen = uiReducer(modalOpen, { type: 'toggleInquiryModal' });
    const openedDrawer = uiReducer(inquiryOpen, { type: 'openDrawer', payload: 'id-1' });
    const closedDrawer = uiReducer(openedDrawer, { type: 'closeDrawer' });

    expect(modalOpen.isAddedModalOpen).toBe(true);
    expect(inquiryOpen.isInquiryModalOpen).toBe(true);
    expect(openedDrawer.isDrawerOpen).toBe(true);
    expect(openedDrawer.selectedTalentId).toBe('id-1');
    expect(closedDrawer.isDrawerOpen).toBe(false);
  });
});
