import React, { createContext, useContext, useLayoutEffect, useRef } from 'react';

export type ToolView = 'pension-simulator' | 'retirement-dc' | 'pension-net-simulator' | 'retirement-total';
export type AppView = 'dashboard' | ToolView;

export const toolNavigationItems: { view: ToolView; number: string; label: string }[] = [
  { view: 'pension-simulator', number: '01', label: '公的年金の受取時期' },
  { view: 'retirement-dc', number: '02', label: '退職金・DC' },
  { view: 'pension-net-simulator', number: '03', label: '年金の手取り' },
  { view: 'retirement-total', number: '04', label: '退職後資金' },
];

export const ToolNavigationContext = createContext<{
  currentView: AppView;
  navigate: (view: AppView) => void;
} | null>(null);

export function ToolNavigation() {
  const navigation = useContext(ToolNavigationContext);
  const strip = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = strip.current;
    const active = container?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!container || !active || container.clientWidth === 0) return;
    // Reveal the active item horizontally without changing the page's vertical scroll.
    const left = active.offsetLeft - container.offsetLeft;
    if (left < container.scrollLeft) container.scrollLeft = left;
    else if (left + active.offsetWidth > container.scrollLeft + container.clientWidth) {
      container.scrollLeft = left + active.offsetWidth - container.clientWidth;
    }
  }, [navigation?.currentView]);

  if (!navigation || navigation.currentView === 'dashboard') return null;

  return (
    <nav className="compass-tool-navigation" aria-label="リタイアメントCOMPASS ツール切り替え">
      <div className="compass-tool-navigation-inner" ref={strip}>
        {toolNavigationItems.map(item => (
          <button
            key={item.view}
            type="button"
            className="compass-tool-tab"
            aria-current={navigation.currentView === item.view ? 'page' : undefined}
            onClick={() => navigation.navigate(item.view)}
          >
            <span className="compass-tool-tab-number">{item.number}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
