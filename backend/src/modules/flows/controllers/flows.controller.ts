import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FlowsService } from '../services/flows.service';
import { Flow } from '../entities/flow.entity';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  create(@Body() createFlowDto: Partial<Flow>): Promise<Flow> {
    return this.flowsService.create(createFlowDto);
  }

  @Get()
  findAll(): Promise<Flow[]> {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Flow | null> {
    return this.flowsService.findOne(+id);
  }

  @Put(':id')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFlowDto: Partial<Flow>,
  ): Promise<Flow | null> {
    return this.flowsService.update(+id, updateFlowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.flowsService.remove(+id);
  }
}
