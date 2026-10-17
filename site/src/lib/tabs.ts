/**
 * Wires the ARIA tabs in `tablist`: click or arrow keys / Home / End select a tab
 * and show the panel named by its `aria-controls`, hiding the others. Takes the
 * tablist rather than a container so tab sets can nest without catching each other's tabs.
 */
export function wireTabs(tablist: HTMLElement): void {
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  function activate(next: HTMLButtonElement, focus: boolean) {
    for (const tab of tabs) {
      const selected = tab === next;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !selected;
    }
    if (focus) next.focus();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab, false));
    tab.addEventListener('keydown', (event) => {
      const i = tabs.indexOf(tab);
      const target =
        event.key === 'ArrowRight'
          ? tabs[(i + 1) % tabs.length]
          : event.key === 'ArrowLeft'
            ? tabs[(i - 1 + tabs.length) % tabs.length]
            : event.key === 'Home'
              ? tabs[0]
              : event.key === 'End'
                ? tabs[tabs.length - 1]
                : undefined;
      if (target) {
        event.preventDefault();
        activate(target, true);
      }
    });
  }
}
