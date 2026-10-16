/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState } from 'react';
import Dashboard from './components/Dashboard';
import { AppSharedData } from './types';
import { AppView, ToolView, ToolNavigationContext } from './components/ToolNavigation';

const RetirementDcCompass = React.lazy(() => import('./components/RetirementDcCompass'));
const PensionSimulator = React.lazy(() => import('./components/PensionSimulator'));
const PensionNetSimulator = React.lazy(() => import('./components/PensionNetSimulator'));
const RetirementTotalDiagnosis = React.lazy(() => import('./components/RetirementTotalDiagnosis'));

function ToolLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-4">
      <div className="flex items-center gap-3 text-sm font-bold text-[#063A70]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#B8CDEC] border-t-[#2F6FED]" />
        画面を読み込んでいます
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [visitedViews, setVisitedViews] = useState<ToolView[]>([]);
  const [totalImportVersion, setTotalImportVersion] = useState(0);
  const navigate = React.useCallback((view: AppView) => {
    if (view !== 'dashboard') {
      setVisitedViews(visited => visited.includes(view) ? visited : [...visited, view]);
    }
    setCurrentView(view);
  }, []);
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);
  const navigation = React.useMemo(() => ({ currentView, navigate }), [currentView, navigate]);
  const [sharedData, setSharedData] = useState<AppSharedData>({
    editedKeys: {}
  });

  const updateSharedData = React.useCallback((newData: Partial<AppSharedData>, editedKeysToMark?: string[]) => {
    setSharedData(prev => {
      const updatedKeys = { ...(prev.editedKeys || {}) };
      if (editedKeysToMark) {
        editedKeysToMark.forEach(key => {
          updatedKeys[key] = true;
        });
      }
      return {
        ...prev,
        ...newData,
        editedKeys: updatedKeys
      };
    });
  }, []);

  const handleSelectTool = (toolId: string) => {
    if (toolId === 'retirement-dc') {
      navigate('retirement-dc');
    } else if (toolId === 'pension-timing') {
      navigate('pension-simulator');
    } else if (toolId === 'pension-net') {
      navigate('pension-net-simulator');
    } else if (toolId === 'total-diagnosis') {
      navigate('retirement-total');
    }
  };

  const handleBackToDashboard = () => {
    navigate('dashboard');
  };

  const handleGoToTotalDiagnosis = () => {
    // Explicit import keeps the original fresh initialization from shared data.
    setTotalImportVersion(version => version + 1);
    navigate('retirement-total');
  };

  return (
    <ToolNavigationContext.Provider value={navigation}>
    <div className="min-h-screen bg-[#F8FAFC]">
      {currentView === 'dashboard' && (
        <Dashboard onSelectTool={handleSelectTool} />
      )}
      {/* Keep visited tools mounted so their existing local input state survives navigation. */}
      {visitedViews.map(view => (
        <div key={view} hidden={currentView !== view} className="compass-tool-view">
        <Suspense fallback={<ToolLoadingState />}>
          {view === 'pension-simulator' ? (
            <PensionSimulator
              onBackToDashboard={handleBackToDashboard}
              sharedData={sharedData}
              updateSharedData={updateSharedData}
              onGoToTotalDiagnosis={handleGoToTotalDiagnosis}
            />
          ) : view === 'pension-net-simulator' ? (
            <PensionNetSimulator
              onBackToDashboard={handleBackToDashboard}
              sharedData={sharedData}
              updateSharedData={updateSharedData}
              onGoToTotalDiagnosis={handleGoToTotalDiagnosis}
            />
          ) : view === 'retirement-total' ? (
            <RetirementTotalDiagnosis
              key={totalImportVersion}
              onBackToDashboard={handleBackToDashboard}
              sharedData={sharedData}
              updateSharedData={updateSharedData}
            />
          ) : (
            <RetirementDcCompass
              onBackToDashboard={handleBackToDashboard}
              sharedData={sharedData}
              updateSharedData={updateSharedData}
              onGoToTotalDiagnosis={handleGoToTotalDiagnosis}
            />
          )}
        </Suspense>
        </div>
      ))}
    </div>
    </ToolNavigationContext.Provider>
  );
}
