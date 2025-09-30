export type AppState = 'Idle' | 'WaitingForNext' | 'WaitingForSend' | 'Finished';
export type CampaignStatus = 'stopped' | 'running' | 'paused' | 'finished';
export type DeliveryStatus = 'Pending' | 'Delivered' | 'Read';

export interface CampaignConfig {
  message1: string;
  file1: File | null;
  message2: string;
  file2: File | null;
  numbers: string[];
  delayBetween: number;
  sendActionDelay: number;
  monitorNumber: string;
  monitorMessages: string[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  status: 'SUCCESS' | 'ERROR' | 'INFO' | 'SKIPPED';
  data?: {
    number?: string;
    status?: 'SENT' | 'FAILED' | 'SKIPPED';
    message?: string;
    file?: string;
    deliveryStatus?: DeliveryStatus;
  }
}
