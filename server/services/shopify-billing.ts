import { shopifyGraphQL } from "../shopify-auth";

export interface BillingPlan {
  name: string;
  price: number;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  trialDays?: number;
}

export const RANKFORGE_PLANS: Record<string, BillingPlan> = {
  free: {
    name: "RankForge Free",
    price: 0,
    interval: "EVERY_30_DAYS",
  },
  pro: {
    name: "RankForge Pro",
    price: 29.99,
    interval: "EVERY_30_DAYS",
    trialDays: 7,
  },
};

export class ShopifyBillingService {
  // Create app subscription
  async createSubscription(
    shop: string,
    accessToken: string,
    planKey: string,
    returnUrl: string
  ): Promise<{
    success: boolean;
    confirmationUrl?: string;
    error?: string;
  }> {
    try {
      const plan = RANKFORGE_PLANS[planKey];
      if (!plan) {
        throw new Error("Invalid plan");
      }

      if (plan.price === 0) {
        // Free plan, no subscription needed
        return { success: true };
      }

      const mutation = `
        mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            lineItems: $lineItems
            test: true
          ) {
            appSubscription {
              id
              status
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        name: plan.name,
        returnUrl,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: plan.price,
                  currencyCode: "USD",
                },
                interval: plan.interval,
              },
            },
          },
        ],
      };

      const result = await shopifyGraphQL(shop, accessToken, mutation, variables);

      if (result.appSubscriptionCreate.userErrors.length > 0) {
        return {
          success: false,
          error: result.appSubscriptionCreate.userErrors[0].message,
        };
      }

      return {
        success: true,
        confirmationUrl: result.appSubscriptionCreate.confirmationUrl,
      };
    } catch (error: any) {
      console.error("Shopify billing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(
    shop: string,
    accessToken: string,
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mutation = `
        mutation AppSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const result = await shopifyGraphQL(shop, accessToken, mutation, {
        id: subscriptionId,
      });

      if (result.appSubscriptionCancel.userErrors.length > 0) {
        return {
          success: false,
          error: result.appSubscriptionCancel.userErrors[0].message,
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get active subscription
  async getActiveSubscription(
    shop: string,
    accessToken: string
  ): Promise<{
    subscription: any | null;
    error?: string;
  }> {
    try {
      const query = `
        query {
          currentAppInstallation {
            activeSubscriptions {
              id
              name
              status
              test
              currentPeriodEnd
              lineItems {
                plan {
                  pricingDetails {
                    ... on AppRecurringPricing {
                      price {
                        amount
                        currencyCode
                      }
                      interval
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const result = await shopifyGraphQL(shop, accessToken, query);

      const subscriptions =
        result.currentAppInstallation?.activeSubscriptions || [];

      return {
        subscription: subscriptions.length > 0 ? subscriptions[0] : null,
      };
    } catch (error: any) {
      return {
        subscription: null,
        error: error.message,
      };
    }
  }
}

export const shopifyBillingService = new ShopifyBillingService();
