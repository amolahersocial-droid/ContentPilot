import { shopifyGraphQL } from "../shopify-auth";

export interface ShopifyEmailOptions {
  shop: string;
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  customerId?: string;
}

export class ShopifyEmailService {
  async sendEmail(options: ShopifyEmailOptions): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Note: Shopify doesn't have a direct "send arbitrary email" API
      // For transactional emails, we use customer emails or order notifications
      // For marketing, merchants use Shopify Email app from their admin
      
      // For this implementation, we'll send customer account invite as example
      // Real implementation should use external email service or Shopify Flow + FlowMail
      
      if (options.customerId) {
        const mutation = `
          mutation CustomerSendAccountInviteEmail($customerId: ID!) {
            customerSendAccountInviteEmail(customerId: $customerId) {
              customer {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const result = await shopifyGraphQL(
          options.shop,
          options.accessToken,
          mutation,
          { customerId: options.customerId }
        );

        if (result.customerSendAccountInviteEmail.userErrors.length > 0) {
          return {
            success: false,
            error: result.customerSendAccountInviteEmail.userErrors[0].message,
          };
        }

        return { success: true };
      }

      // For general emails, recommend using external service like SendGrid
      // or Shopify Flow app for automated emails
      console.warn(
        "Shopify mode: Use Shopify Email app for marketing or external service for transactional emails"
      );
      
      return {
        success: false,
        error: "Use Shopify Email app for marketing campaigns or configure external email service",
      };
    } catch (error: any) {
      console.error("Shopify email error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Method to create a draft email campaign (requires Shopify Email app installed)
  async createEmailCampaign(
    shop: string,
    accessToken: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      // This would use Shopify Email API if available
      // For now, return instruction to use Shopify Email app
      return {
        success: false,
        error: "Please use Shopify Email app in your Shopify admin to create email campaigns. Navigate to Marketing > Campaigns > Create campaign",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const shopifyEmailService = new ShopifyEmailService();
