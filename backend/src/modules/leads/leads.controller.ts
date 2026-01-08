import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadsService } from './services/leads.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadStatus } from './entities/lead.entity';
import { AssignmentsService } from '../assignments/services/assignments.service';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('manual')
  async createManualLead(
    @Body()
    body: {
      name: string;
      phone: string;
      email?: string;
      context: string;
      source?: string;
      advisorId?: number; // Optional advisor ID for direct assignment
    },
  ) {
    // 1. Create Lead
    const lead = await this.leadsService.createLead({
      name: body.name,
      phone: body.phone,
      source: body.source || 'MANUAL_INPUT',
    });

    if (body.email) {
      await this.leadsService.updateEmail(lead.id, body.email);
    }

    // 2. Add Context Note (System Summary for AI context)
    const contextContent =
      body.context || 'Ingreso manual sin contexto adicional.';
    await this.leadsService.addNote({
      leadId: lead.id,
      content: `Contexto Manual: ${contextContent}`,
      type: 'SYSTEM_SUMMARY',
    });

    // 3. Assignment Logic
    if (body.advisorId) {
      // Direct Assignment
      await this.assignmentsService.createAssignment(
        lead.id,
        body.advisorId,
        'MANUAL',
      );

      // Emit event for notification (Manual Assignment Template)
      this.eventEmitter.emit('assignment.manual', {
        leadId: lead.id,
        advisorId: body.advisorId,
        leadName: lead.name,
        leadPhone: lead.phone,
      });
    } else {
      // Automatic Assignment (Round Robin) via Pipeline
      // We use 'pipeline.assign' event which PipelineService listens to (or similar logic)
      // If PipelineService isn't listening to 'lead.manual_created', we should call it directly or emit the right event.
      // Assuming 'pipeline.assign' triggers the distribution logic if no advisorId is provided.
      // However, usually 'pipeline.assign' REQUIRES an advisorId if it's the final step.
      // We need to trigger the "Find Advisor" logic.

      // Let's emit a specific event that the system uses to pick an advisor.
      // If no such event exists, we can use a service method if available.
      // For now, let's stick to the convention: emit 'lead.manual_created' and ensure PipelineService handles it.
      this.eventEmitter.emit('lead.manual_created', lead);
    }

    return lead;
  }

  @Post('upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const content = file.buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or missing data');
    }

    // Parse Headers (Simple CSV parser)
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim().replace(/"/g, ''));

    // Map headers to indices
    const nameIdx = headers.findIndex(
      (h) => h.includes('name') || h.includes('nombre'),
    );
    const phoneIdx = headers.findIndex(
      (h) =>
        h.includes('phone') || h.includes('telefono') || h.includes('teléfono'),
    );
    const emailIdx = headers.findIndex(
      (h) => h.includes('email') || h.includes('correo'),
    );
    const contextIdx = headers.findIndex(
      (h) =>
        h.includes('context') || h.includes('contexto') || h.includes('nota'),
    );

    if (nameIdx === -1 || phoneIdx === -1) {
      throw new BadRequestException(
        'CSV must contain "name" and "phone" columns',
      );
    }

    let successCount = 0;
    const errors: string[] = [];

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i]
          .split(',')
          .map((cell) => cell.trim().replace(/"/g, ''));

        if (row.length < 2) continue; // Skip invalid rows

        const name = row[nameIdx];
        const phone = row[phoneIdx];
        const email = emailIdx !== -1 ? row[emailIdx] : null;
        const context = contextIdx !== -1 ? row[contextIdx] : null;

        if (!name || !phone) continue;

        // Create Lead with PENDING_DISTRIBUTION status
        // Note: createLead defaults to NUEVO. We need to update it or create with specific status if supported.
        // Assuming createLead returns the entity, we can update status immediately.

        const lead = await this.leadsService.createLead({
          name,
          phone,
          source: 'MASSIVE_IMPORT',
        });

        // Force update status to PENDING_DISTRIBUTION
        await this.leadsService.updateStatus(
          lead.id,
          LeadStatus.PENDING_DISTRIBUTION,
        );

        if (email) await this.leadsService.updateEmail(lead.id, String(email));
        if (context) {
          await this.leadsService.addNote({
            leadId: lead.id,
            content: `Contexto Importación: ${context}`,
            type: 'SYSTEM_SUMMARY',
          });
        }

        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      message: 'CSV processing completed',
      processed: lines.length - 1,
      success: successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
