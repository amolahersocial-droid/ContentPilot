import Razorpay from "razorpay";
import crypto from "crypto";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export class RazorpayService {
  private razorpay: Razorpay;
  private keySecret: string;

  constructor(config: RazorpayConfig) {
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
    this.keySecret = config.keySecret;
  }

  /**
   * Create a subscription for paid plan
   */
  async createSubscription(params: {
    planId: string;
    customerId?: string;
    customerEmail: string;
    customerName: string;
    totalCount?: number;
  }) {
    try {
      // Create customer if not exists
      let customerId = params.customerId;
      if (!customerId) {
        const customer = await this.razorpay.customers.create({
          name: params.customerName,
          email: params.customerEmail,
        });
        customerId = customer.id;
      }

      // Create subscription
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: params.planId,
        customer_id: customerId,
        total_count: params.totalCount || 12, // Default 12 months
        quantity: 1,
        notify: 1, // Send notifications
      });

      return {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        shortUrl: subscription.short_url,
      };
    } catch (error: any) {
      throw new Error(`Razorpay subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Create a one-time payment order
   */
  async createOrder(params: {
    amount: number; // in paise (100 paise = 1 INR)
    currency?: string;
    receipt?: string;
  }) {
    try {
      const order = await this.razorpay.orders.create({
        amount: params.amount,
        currency: params.currency || "INR",
        receipt: params.receipt || `receipt_${Date.now()}`,
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error: any) {
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(params: {
    orderId?: string;
    paymentId: string;
    signature: string;
    subscriptionId?: string;
  }): boolean {
    try {
      let message = "";
      if (params.orderId) {
        message = `${params.orderId}|${params.paymentId}`;
      } else if (params.subscriptionId) {
        message = `${params.paymentId}|${params.subscriptionId}`;
      } else {
        return false;
      }

      const expectedSignature = crypto
        .createHmac("sha256", this.keySecret)
        .update(message)
        .digest("hex");

      return expectedSignature === params.signature;
    } catch {
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(subscriptionId);
      return {
        id: subscription.id,
        status: subscription.status,
      };
    } catch (error: any) {
      throw new Error(`Razorpay subscription cancellation failed: ${error.message}`);
    }
  }

  /**
   * Fetch subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      return await this.razorpay.subscriptions.fetch(subscriptionId);
    } catch (error: any) {
      throw new Error(`Razorpay subscription fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch payment details
   */
  async getPayment(paymentId: string) {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error: any) {
      throw new Error(`Razorpay payment fetch failed: ${error.message}`);
    }
  }
}

// Singleton instance - will be initialized when keys are provided
let razorpayInstance: RazorpayService | null = null;

export function initializeRazorpay(config: RazorpayConfig) {
  razorpayInstance = new RazorpayService(config);
  return razorpayInstance;
}

export function getRazorpayInstance(): RazorpayService {
  if (!razorpayInstance) {
    // Check if keys exist in environment
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (keyId && keySecret) {
      razorpayInstance = new RazorpayService({ keyId, keySecret });
    } else {
      throw new Error("Razorpay not initialized. Please provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
    }
  }
  return razorpayInstance;
}
