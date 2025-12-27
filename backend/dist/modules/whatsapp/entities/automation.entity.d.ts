export interface AdvisorAutomationConfig {
    responseTimeLimitMinutes: number;
    reminderEnabled: boolean;
    reminderIntervalMinutes: number;
    useAiSummary: boolean;
    aiSummaryPrompt?: string;
    enableInteractiveButtons: boolean;
    assignmentMessage?: string;
    slaWarningMessage?: string;
    notesPromptMessage?: string;
    successNoteMessage?: string;
}
export type AutomationConfig = LeadQualificationConfig | AdvisorAutomationConfig;
export interface LeadQualificationConfig {
    questions: string[];
    welcomeMessage: string;
    welcomeButtonText?: string;
    completionMessage: string;
    systemPrompt?: string;
    askForName?: boolean;
    tone?: 'profesional' | 'amigable' | 'casual' | 'formal';
    businessContext?: string;
    products?: {
        name: string;
        description: string;
        price?: string;
    }[];
    brochureUrl?: string;
    websiteUrl?: string;
    offHoursEnabled?: boolean;
    offHoursMessage?: string;
    workingHours?: {
        start: string;
        end: string;
    };
}
export declare class Automation {
    id: number;
    name: string;
    isActive: boolean;
    config: AutomationConfig;
    createdAt: Date;
    updatedAt: Date;
}
