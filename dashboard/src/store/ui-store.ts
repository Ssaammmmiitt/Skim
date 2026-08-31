import { create } from "zustand";

type UiState = {
  mobileNavOpen: boolean;
  navScrolled: boolean;
  setMobileNavOpen: (open: boolean) => void;
  setNavScrolled: (scrolled: boolean) => void;
  closeMobileNav: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  navScrolled: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setNavScrolled: (scrolled) => set({ navScrolled: scrolled }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}));

export function resetUiStore(): void {
  useUiStore.setState({ mobileNavOpen: false, navScrolled: false });
}
