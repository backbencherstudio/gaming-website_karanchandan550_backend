import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUpiPaymentDto, PaymentStatus } from './dto/create-upi-payment.dto';
import { UpdateUpiPaymentDto } from './dto/update-upi-payment.dto';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import * as QRCode from 'qrcode';

interface GetAllPaymentsParams {
  page: number;
  limit: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class UpiPaymentService {
  private razorpay: Razorpay;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  async create(createUpiPaymentDto: CreateUpiPaymentDto) {
    try {
      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: createUpiPaymentDto.amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          description: createUpiPaymentDto.description,
          ...(createUpiPaymentDto.notes && { notes: createUpiPaymentDto.notes }),
        },
        payment_capture: true
      });

      // Generate UPI intent URL
      const upiId = this.configService.get('RAZORPAY_UPI_ID');
      const amount = createUpiPaymentDto.amount;
      const merchantName = 'Blox Fruits Hub';
      const upiIntentUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(createUpiPaymentDto.description)}&tr=${order.id}`;

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(upiIntentUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Save payment details to database
      const payment = await this.prisma.payment.create({
        data: {
          order_id: order.id,
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          customer_name: createUpiPaymentDto.name,
          customer_email: createUpiPaymentDto.email,
          customer_phone: createUpiPaymentDto.phone,
          customer_address: createUpiPaymentDto.address,
          description: createUpiPaymentDto.description,
          notes: createUpiPaymentDto.notes,
        },
      });

      return {
        success: true,
        data: {
          qr_code: qrCodeDataUrl,
          upi_intent_url: upiIntentUrl,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          payment_id: payment.id,
          vpa: upiId
        },
        message: 'UPI payment QR code generated successfully',
      };
    } catch (error) {
      console.error('Razorpay Error:', error);
      throw new BadRequestException(
        error?.error?.description || error?.message || 'Failed to create payment',
      );
    }
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string) {
    try {
      const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature === signature) {
        // Update payment status in database
        const payment = await this.prisma.payment.update({
          where: { order_id: orderId },
          data: { status: PaymentStatus.COMPLETED },
        });

        return {
          success: true,
          data: payment,
          message: 'Payment verified successfully',
        };
      } else {
        throw new BadRequestException('Invalid payment signature');
      }
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to verify payment',
      );
    }
  }

  async findAll() {
    try {
      const payments = await this.prisma.payment.findMany({
        orderBy: { created_at: 'desc' },
      });

      return {
        success: true,
        data: payments,
        message: 'Payments fetched successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch payments',
      );
    }
  }

  async findOne(id: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      return {
        success: true,
        data: payment,
        message: 'Payment fetched successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch payment',
      );
    }
  }

  async update(id: string, updateUpiPaymentDto: UpdateUpiPaymentDto) {
    try {
      const payment = await this.prisma.payment.update({
        where: { id },
        data: updateUpiPaymentDto,
      });

      return {
        success: true,
        data: payment,
        message: 'Payment updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to update payment',
      );
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.payment.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Payment deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to delete payment',
      );
    }
  }

  async getPaymentStatus(orderId: string) {
    try {
      // Get payment from database
      const payment = await this.prisma.payment.findFirst({
        where: {
          order_id: orderId,
          deleted_at: null
        }
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // If payment is already completed, return status
      if (payment.status === PaymentStatus.COMPLETED) {
        return {
          success: true,
          data: {
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            created_at: payment.created_at
          },
          message: 'Payment completed'
        };
      }

      // Check payment status from Razorpay
      const order = await this.razorpay.orders.fetch(orderId);
      const payments = await this.razorpay.orders.fetchPayments(orderId);

      // If payment exists and is captured, update status
      if (payments && payments.items && payments.items.length > 0) {
        const razorpayPayment = payments.items[0];
        if (razorpayPayment.status === 'captured') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.COMPLETED }
          });

          return {
            success: true,
            data: {
              status: PaymentStatus.COMPLETED,
              amount: payment.amount,
              currency: payment.currency,
              created_at: payment.created_at
            },
            message: 'Payment completed'
          };
        }
      }

      return {
        success: true,
        data: {
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at
        },
        message: 'Payment pending'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to fetch payment status'
      );
    }
  }

  async getAllPayments({
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
  }: GetAllPaymentsParams) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where: any = {
        deleted_at: null,
      };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at.gte = new Date(startDate);
        }
        if (endDate) {
          where.created_at.lte = new Date(endDate);
        }
      }

      // Get total count for pagination
      const total = await this.prisma.payment.count({ where });

      // Get paginated payments
      const payments = await this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          order_id: true,
          amount: true,
          currency: true,
          status: true,
          customer_name: true,
          customer_email: true,
          customer_phone: true,
          customer_address: true,
          description: true,
          notes: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch payments'
      );
    }
  }
}
