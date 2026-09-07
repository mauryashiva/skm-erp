import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { DivisionsModule } from './divisions/divisions.module';
import { FinancialYearsModule } from './financial-years/financial-years.module';
import { PostalLookupModule } from './postal-lookup/postal-lookup.module';
import { PincodeModule } from './parameters/pincode/pincode.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    SupabaseModule,
    AuthModule,
    DivisionsModule,
    FinancialYearsModule,
    PostalLookupModule,
    PincodeModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
