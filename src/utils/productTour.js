export const TOUR_START_EVENT = 'leados-start-tour'

export function startProductTour() {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT))
}
