import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Terms() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <CardDescription>Last updated: October 5, 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6 text-sm">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using RankForge ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
                <p className="text-muted-foreground mb-2">
                  Permission is granted to temporarily use the Service for personal or commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained in the Service</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Service Description</h2>
                <p className="text-muted-foreground">
                  RankForge provides AI-powered SEO content generation and automated publishing services for WordPress and Shopify websites. The Service includes content creation, image generation, SEO optimization, and scheduled publishing features.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. User Obligations</h2>
                <p className="text-muted-foreground mb-2">You agree to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide accurate and complete information when using the Service</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Use the Service in compliance with all applicable laws and regulations</li>
                  <li>Not use the Service to generate illegal, harmful, or misleading content</li>
                  <li>Respect intellectual property rights when using generated content</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Payment and Subscriptions</h2>
                <p className="text-muted-foreground">
                  Subscription fees are billed in advance on a recurring basis. You authorize us to charge your payment method for all fees owed. Refunds are handled on a case-by-case basis and are at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Content Ownership</h2>
                <p className="text-muted-foreground">
                  You retain all rights to content you create using the Service. However, you grant us a license to use, store, and process your content as necessary to provide the Service. AI-generated content is provided "as-is" and you are responsible for reviewing and editing before publication.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Third-Party Services</h2>
                <p className="text-muted-foreground">
                  The Service integrates with third-party platforms including WordPress, Shopify, and OpenAI. Your use of these integrations is subject to their respective terms of service. We are not responsible for the availability or functionality of third-party services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Disclaimer</h2>
                <p className="text-muted-foreground">
                  The Service is provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Limitations</h2>
                <p className="text-muted-foreground">
                  In no event shall RankForge or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Data Processing</h2>
                <p className="text-muted-foreground">
                  We process your data in accordance with our Privacy Policy. By using the Service, you consent to such processing and you warrant that all data provided by you is accurate.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">13. Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have any questions about these Terms, please contact us through the Support page or email us at support@rankforge.com.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms shall be governed and construed in accordance with the laws of your jurisdiction, without regard to its conflict of law provisions.
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
