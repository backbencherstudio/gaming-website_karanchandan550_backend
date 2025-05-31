import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { UpiPaymentService } from './upi-payment.service';
import { CreateUpiPaymentDto } from './dto/create-upi-payment.dto';
import { UpdateUpiPaymentDto } from './dto/update-upi-payment.dto';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';

@Controller('upi-payment')
export class UpiPaymentController {
  constructor(
    private readonly upiPaymentService: UpiPaymentService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async create(@Body() createUpiPaymentDto: CreateUpiPaymentDto) {
    try {
      return await this.upiPaymentService.create(createUpiPaymentDto);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to create UPI payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('callback')
  async handleCallback(
    @Query('razorpay_payment_id') paymentId: string,
    @Query('razorpay_order_id') orderId: string,
    @Query('razorpay_signature') razorpaySignature: string,
  ) {
    try {
      // Verify webhook secret
      const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      // Verify Razorpay signature
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        throw new BadRequestException('Invalid signature');
      }

      return await this.upiPaymentService.verifyPayment(paymentId, orderId, razorpaySignature);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to verify payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('status/:orderId')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    try {
      return await this.upiPaymentService.getPaymentStatus(orderId);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to get payment status',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.upiPaymentService.findAll();
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to fetch payments',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.upiPaymentService.findOne(id);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to fetch payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUpiPaymentDto: UpdateUpiPaymentDto) {
    try {
      return await this.upiPaymentService.update(id, updateUpiPaymentDto);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to update payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.upiPaymentService.remove(id);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to delete payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const payments = await this.upiPaymentService.getAllPayments({
        page,
        limit,
        status,
        startDate,
        endDate,
      });

      return {
        success: true,
        data: payments,
        message: 'Payments fetched successfully',
      };
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to fetch payments',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }
}
