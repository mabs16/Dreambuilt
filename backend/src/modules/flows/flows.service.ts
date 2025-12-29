import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowSession } from './entities/flow-session.entity';

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    @InjectRepository(Flow)
    private readonly flowRepository: Repository<Flow>,
    @InjectRepository(FlowSession)
    private readonly sessionRepository: Repository<FlowSession>,
  ) {}

  async create(createFlowDto: Partial<Flow>) {
    if (createFlowDto.trigger_keywords) {
      createFlowDto.trigger_keywords = createFlowDto.trigger_keywords.map((k) =>
        k.toLowerCase().trim(),
      );
    }
    const flow = this.flowRepository.create(createFlowDto);
    return await this.flowRepository.save(flow);
  }

  async findAll() {
    return await this.flowRepository.find({
      order: { updated_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    return await this.flowRepository.findOne({ where: { id } });
  }

  async findByKeyword(keyword: string): Promise<Flow | null> {
    this.logger.log(`Searching for flow with keyword: "${keyword}"`);
    return await this.flowRepository
      .createQueryBuilder('flow')
      .where(':keyword = ANY(flow.trigger_keywords)', { keyword })
      .andWhere('flow.is_active = :isActive', { isActive: true })
      .getOne();
  }

  async update(id: number, updateFlowDto: Partial<Flow>) {
    if (updateFlowDto.trigger_keywords) {
      updateFlowDto.trigger_keywords = updateFlowDto.trigger_keywords.map((k) =>
        k.toLowerCase().trim(),
      );
    }
    await this.flowRepository.update(id, updateFlowDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return await this.flowRepository.delete(id);
  }

  // --- SESSION MANAGEMENT ---

  async getActiveSession(leadId: number): Promise<FlowSession | null> {
    return await this.sessionRepository.findOne({
      where: { lead_id: leadId, status: 'ACTIVE' },
      relations: { flow: true },
    });
  }

  async createSession(leadId: number, flowId: number, startNodeId: string) {
    // Close any existing sessions first
    await this.sessionRepository.update(
      { lead_id: leadId, status: 'ACTIVE' },
      { status: 'INTERRUPTED' },
    );

    const session = this.sessionRepository.create({
      lead_id: leadId,
      flow_id: flowId,
      current_node_id: startNodeId,
      status: 'ACTIVE',
      variables: {},
    });
    return await this.sessionRepository.save(session);
  }

  async updateSessionNode(
    sessionId: string,
    nextNodeId: string,
    variables?: Record<string, any>,
  ) {
    const updateData: Partial<FlowSession> = { current_node_id: nextNodeId };
    if (variables) {
      updateData.variables = variables;
    }
    await this.sessionRepository.update(sessionId, updateData);
  }

  async updateSessionVariables(
    sessionId: string,
    variables: Record<string, any>,
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) return;

    // Merge new variables with existing ones
    const newVariables = { ...session.variables, ...variables };
    await this.sessionRepository.update(sessionId, { variables: newVariables });
  }

  async findOneSession(sessionId: string): Promise<FlowSession | null> {
    return await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { flow: true },
    });
  }

  async completeSession(sessionId: string) {
    await this.sessionRepository.update(sessionId, { status: 'COMPLETED' });
  }
}
