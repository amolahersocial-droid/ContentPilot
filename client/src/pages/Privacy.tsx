import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">Privacy Policy</h1>
        <p className="text-muted-foreground" data-testid="text-subtitle">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Account Information</h3>
            <p className="text-muted-foreground">
              We collect your email address and basic account information when you create an account with RankForge.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Site Connection Data</h3>
            <p className="text-muted-foreground">
              When you connect WordPress or Shopify sites, we securely store authentication credentials to enable content publishing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Content Data</h3>
            <p className="text-muted-foreground">
              We store the content you generate, including blog posts, keywords, and SEO settings to provide our services.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>To provide and maintain RankForge services</li>
            <li>To process your content generation and publishing requests</li>
            <li>To send service-related notifications</li>
            <li>To improve our platform and develop new features</li>
            <li>To comply with legal obligations</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We implement industry-standard security measures to protect your data, including encryption at rest and in transit,
            secure API key storage, and regular security audits. API credentials are encrypted and never exposed in logs or error messages.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">OpenAI</h3>
            <p className="text-muted-foreground">
              We use OpenAI's API to generate content. Your content prompts are sent to OpenAI for processing.
              Please review OpenAI's privacy policy at https://openai.com/privacy
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Razorpay</h3>
            <p className="text-muted-foreground">
              Payment processing is handled by Razorpay. We do not store your payment card details.
              Please review Razorpay's privacy policy at https://razorpay.com/privacy
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Shopify (for Shopify app users)</h3>
            <p className="text-muted-foreground">
              When using RankForge as a Shopify app, we access your store data as authorized during installation.
              Please review Shopify's privacy policy at https://www.shopify.com/legal/privacy
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Retention & Deletion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We retain your data as long as your account is active. You can request account deletion at any time from your settings.
            Upon deletion, all your data will be permanently removed within 30 days, except where we are required to retain it by law.
          </p>
          <p className="text-muted-foreground">
            For Shopify app users, if you uninstall the app, all data associated with your store will be deleted within 48 hours.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GDPR Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            If you are located in the European Economic Area (EEA), you have rights under GDPR including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
            <li>Right to access your personal data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            To exercise these rights, contact us at privacy@rankforge.com
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-muted-foreground mt-2">
            Email: <a href="mailto:privacy@rankforge.com" className="text-primary hover:underline">privacy@rankforge.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
