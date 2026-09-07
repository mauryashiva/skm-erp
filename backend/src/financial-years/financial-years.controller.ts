import { Controller, Get, UseGuards } from '@nestjs/common';
import { FinancialYearsService } from './financial-years.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('financial-years')
export class FinancialYearsController {
  constructor(private readonly financialYearsService: FinancialYearsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll() {
    return this.financialYearsService.getAllFinancialYears();
  }
}
