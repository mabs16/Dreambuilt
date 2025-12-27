import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';

import { LeadsModule } from './modules/leads/leads.module';
import { AdvisorsModule } from './modules/advisors/advisors.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { EventsModule } from './modules/events/events.module';
import { SlaModule } from './modules/sla/sla.module';
import { ScoresModule } from './modules/scores/scores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false, // Use migrations for production
        ssl: { rejectUnauthorized: false },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          tls: configService.get('redis.tls'),
        },
      }),
      inject: [ConfigService],
    }),
    LeadsModule,
    AdvisorsModule,
    WhatsappModule,
    AssignmentsModule,
    EventsModule,
    SlaModule,
    ScoresModule,
  ],
})
export class AppModule { }
