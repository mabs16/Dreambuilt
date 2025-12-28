import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { Flow } from './entities/flow.entity';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  create(@Body() createFlowDto: Partial<Flow>) {
    return this.flowsService.create(createFlowDto);
  }

  @Get()
  findAll() {
    return this.flowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.flowsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFlowDto: Partial<Flow>) {
    return this.flowsService.update(+id, updateFlowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flowsService.remove(+id);
  }
}
