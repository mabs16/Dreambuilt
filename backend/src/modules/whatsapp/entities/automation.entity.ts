import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface AdvisorAutomationConfig {
  responseTimeLimitMinutes: number;
  reminderEnabled: boolean;
  reminderIntervalMinutes: number;
  useAiSummary: boolean;
  aiSummaryPrompt?: string;
  enableInteractiveButtons: boolean;
  // Mensajes personalizables
  assignmentMessage?: string;
  slaWarningMessage?: string;
  notesPromptMessage?: string;
  successNoteMessage?: string;
}

export type AutomationConfig =
  | LeadQualificationConfig
  | AdvisorAutomationConfig;

export interface LeadQualificationConfig {
  // Flow Configuration
  questions: string[];
  welcomeMessage: string;
  welcomeButtonText?: string;
  completionMessage: string;

  // AI Personality & Context
  systemPrompt?: string;
  askForName?: boolean;
  tone?: 'profesional' | 'amigable' | 'casual' | 'formal';
  businessContext?: string;
  products?: { name: string; description: string; price?: string }[];

  // Media & Resources
  brochureUrl?: string;
  websiteUrl?: string;

  // Off-Hours Behavior
  offHoursEnabled?: boolean;
  offHoursMessage?: string;
  workingHours?: { start: string; end: string };
}

@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'lead_qualification' })
  name: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column('jsonb', { nullable: true })
  config: AutomationConfig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
