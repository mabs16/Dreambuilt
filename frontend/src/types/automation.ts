export interface ButtonConfig {
    action: string;
    label: string;
    enabled: boolean;
}

export interface MessageConfig {
    message: string;
    buttons: ButtonConfig[];
}

export interface AdvisorAutomationConfig {
    responseTimeLimitMinutes: number;
    reminderEnabled: boolean;
    reminderIntervalMinutes: number;
    useAiSummary: boolean;
    aiSummaryPrompt?: string;
    enableInteractiveButtons: boolean;
    
    // Legacy Communication (Deprecated)
    assignmentMessage?: string;

    // New Granular Communication
    systemAssignment?: MessageConfig;
    systemAssignmentAction?: MessageConfig;

    manualAssignment?: MessageConfig;
    manualAssignmentAction?: MessageConfig;

    reassignment?: MessageConfig;
    reassignmentAction?: MessageConfig;
    
    followUpInstructions?: string;
    slaWarningMessage?: string;
    
    // Roll Call (Pase de Lista)
    rollCallEnabled?: boolean;
    rollCallSchedules?: string[]; // ["09:00", "14:00"]
    rollCallMessage?: string;
}

export interface Automation {
    id: number;
    isActive: boolean;
    config: AdvisorAutomationConfig;
    name: string;
}
