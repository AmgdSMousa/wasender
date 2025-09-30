
import React, { useState, useRef, useEffect } from 'react';
import { CampaignConfig, AppState, LogEntry, CampaignStatus, DeliveryStatus } from './types';
import { ConfigPanel } from './components/ConfigPanel';
import { CampaignView } from './components/CampaignView';
import { ConfirmationDialog } from './components/ConfirmationDialog';

const App: React.FC = () => {
  const [config, setConfig] = useState<CampaignConfig>({
    message1: 'Hello! This is message template 1.',
    file1: null,
    message2: 'Hi there, this is the second message template.',
    file2: null,
    numbers: [],
    delayBetween: 15,
    sendActionDelay: 5,
    monitorNumber: '',
    monitorMessages: [
      "New message sent ✅",
      "Message dispatched successfully 🚀",
      "Monitoring is active 🔄",
      "Processing next number ⏳"
    ],
  });
  const [appState, setAppState] = useState<AppState>('Idle');
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('stopped');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [currentNumberIndex, setCurrentNumberIndex] = useState(0);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = (message: string, status: LogEntry['status'], data?: LogEntry['data']) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prevLog => [{ timestamp, message, status, data }, ...prevLog]);
  };

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    timerRef.current = null;
    actionTimerRef.current = null;
  };
  
  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!config.message1.trim() && !config.message2.trim()) {
      newErrors.messages = "At least one message template is required.";
    }
    if (config.numbers.length === 0) {
      newErrors.numbers = "At least one phone number is required.";
    } else if (config.numbers.some(n => !/^\+?\d+$/.test(n))) {
      newErrors.numbers = "All phone numbers must be in a valid format (e.g., +1234567890 or 1234567890).";
    }
    if (config.delayBetween <= 0) {
      newErrors.delayBetween = "Delay must be a positive number.";
    }
    if (config.sendActionDelay <= 0) {
      newErrors.sendActionDelay = "Action delay must be a positive number.";
    }
    if (config.monitorNumber && !/^\+?\d+$/.test(config.monitorNumber)) {
      newErrors.monitorNumber = "Monitor number must be a valid phone number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartCampaign = () => {
    if (validateConfig()) {
      setConfirmationOpen(true);
    }
  };
  
  const executeStartCampaign = () => {
    setLog([]);
    setCurrentNumberIndex(0);
    setCampaignStatus('running');
    addLog('Campaign started.', 'INFO');
    processNextNumber(0);
  };
  
  const handleStopCampaign = () => {
    clearTimers();
    setAppState('Idle');
    setCampaignStatus('stopped');
    addLog('Campaign stopped by user.', 'INFO');
  };

  const handlePauseCampaign = () => {
    clearTimers();
    setCampaignStatus('paused');
    addLog('Campaign paused.', 'INFO');
  };

  const handleResumeCampaign = () => {
    setCampaignStatus('running');
    addLog('Campaign resumed.', 'INFO');
    // If it was paused during the main delay, restart that delay
    if (appState === 'WaitingForNext') {
      processNextNumber(currentNumberIndex);
    } 
    // If it was paused during the action timer, restart that action
    else if (appState === 'WaitingForSend') {
      startSendAction(currentNumberIndex);
    }
  };

  const handleSkipNumber = () => {
    if (actionTimerRef.current) {
        clearTimeout(actionTimerRef.current);
        actionTimerRef.current = null;
    }
    const skippedNumber = config.numbers[currentNumberIndex];
    addLog(`Skipped number: ${skippedNumber}`, 'SKIPPED', {
        number: skippedNumber,
        status: 'SKIPPED',
    });
    const nextIndex = currentNumberIndex + 1;
    setCurrentNumberIndex(nextIndex);
    processNextNumber(nextIndex);
  };
  
  const processNextNumber = (index: number) => {
    if (index >= config.numbers.length) {
      setAppState('Finished');
      setCampaignStatus('finished');
      addLog('Campaign finished.', 'INFO');
      clearTimers();
      return;
    }
    
    setAppState('WaitingForNext');
    // Don't wait for the first number
    const delay = index === 0 ? 0 : config.delayBetween * 1000;

    timerRef.current = setTimeout(() => {
        startSendAction(index);
    }, delay);
  };

  const startSendAction = (index: number) => {
    setAppState('WaitingForSend');
    actionTimerRef.current = setTimeout(() => {
        const sentNumber = config.numbers[index];
        const msgIndex = index % 2;
        const msg = msgIndex === 0 ? config.message1 : config.message2;
        const file = msgIndex === 0 ? config.file1 : config.file2;

        addLog(`Message presumed SENT to ${sentNumber}.`, 'SUCCESS', {
            number: sentNumber,
            status: 'SENT',
            message: msg,
            file: file?.name,
            deliveryStatus: 'Pending',
        });

        // Send monitor message if configured
        if (config.monitorNumber && config.monitorMessages.length > 0) {
            const monitorMsg = config.monitorMessages[Math.floor(Math.random() * config.monitorMessages.length)];
            addLog(`Sending monitor message to ${config.monitorNumber}`, 'INFO');
            // In a real scenario this would trigger an API call or similar. Here, we just log it.
        }

        const nextIndex = index + 1;
        setCurrentNumberIndex(nextIndex);
        processNextNumber(nextIndex);

    }, config.sendActionDelay * 1000);
  }

  const handleUpdateDeliveryStatus = (logIndex: number, newStatus: DeliveryStatus) => {
    setLog(prevLog => {
        const newLog = [...prevLog];
        const entry = newLog[logIndex];
        if (entry && entry.data) {
            entry.data.deliveryStatus = newStatus;
        }
        return newLog;
    });
  };

  const currentActionInfo = {
    number: config.numbers[currentNumberIndex],
    message: currentNumberIndex % 2 === 0 ? config.message1 : config.message2,
    file: currentNumberIndex % 2 === 0 ? config.file1 : config.file2,
    actionDelay: config.sendActionDelay,
  };

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200 p-4 sm:p-6 md:p-8">
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ConfigPanel
            config={config}
            setConfig={setConfig}
            onStart={handleStartCampaign}
            onStop={handleStopCampaign}
            onPause={handlePauseCampaign}
            onResume={handleResumeCampaign}
            campaignStatus={campaignStatus}
            errors={errors}
          />
        </div>
        <div className="lg:col-span-2">
          <CampaignView
            appState={appState}
            campaignStatus={campaignStatus}
            log={log}
            currentNumberIndex={currentNumberIndex}
            totalNumbers={config.numbers.length}
            currentActionInfo={currentActionInfo}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            onSkipNumber={handleSkipNumber}
            // FIX: Pass delayBetween to CampaignView component.
            delayBetween={config.delayBetween}
          />
        </div>
      </main>
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={executeStartCampaign}
        title="Confirm Campaign Start"
        confirmText="Start Campaign"
      >
        <p>You are about to start a campaign with the following settings:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Contacts:</strong> {config.numbers.length}</li>
          <li><strong>Delay Between Messages:</strong> {config.delayBetween} seconds</li>
          <li><strong>Action Timer:</strong> {config.sendActionDelay} seconds</li>
        </ul>
        <p className="mt-4 font-semibold">Please confirm to proceed.</p>
      </ConfirmationDialog>
    </div>
  );
};

export default App;
