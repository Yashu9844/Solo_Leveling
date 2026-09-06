// The component kit — design/00-DESIGN-SYSTEM.md §6.
// One import site for every primitive, so a screen never reaches into a
// file path and refactors stay cheap.
export { ScreenShell, SafeTop, SafeBottom } from './ScreenShell';
export { PageTransition, type TransitionEdge } from './PageTransition';
