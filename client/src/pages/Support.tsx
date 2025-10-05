import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Book, HelpCircle } from "lucide-react";

export default function Support() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">Support Center</h1>
        <p className="text-muted-foreground" data-testid="text-subtitle">
          We're here to help you get the most out of RankForge
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Email Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Get in touch with our support team for technical issues, billing questions, or general inquiries.
            </p>
            <Button asChild data-testid="button-email-support">
              <a href="mailto:support@rankforge.com">
                Contact Support
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Live Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Chat with our support team in real-time. Available Monday-Friday, 9AM-6PM EST.
            </p>
            <Button variant="outline" data-testid="button-live-chat">
              Start Chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              How do I connect my WordPress site?
            </h3>
            <p className="text-muted-foreground">
              Go to Sites, click "Add Site", select WordPress, and enter your site URL and Application Password. 
              You can generate an Application Password from your WordPress admin under Users → Profile.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              How do I connect my Shopify store?
            </h3>
            <p className="text-muted-foreground">
              If using the Shopify app, your store is automatically connected. For standalone mode, 
              go to Sites, click "Add Site", select Shopify, and enter your store URL and API credentials.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              What's the difference between free and paid plans?
            </h3>
            <p className="text-muted-foreground">
              Free plans are limited to 3 posts per day and require your own OpenAI API key. 
              Paid plans offer unlimited posts, priority processing, and use our managed OpenAI credits.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              How does scheduled publishing work?
            </h3>
            <p className="text-muted-foreground">
              Set up a schedule in Site Settings. RankForge will automatically generate and publish posts 
              at your chosen time using keywords from your tracked list.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Can I customize the generated content?
            </h3>
            <p className="text-muted-foreground">
              Yes! After content is generated, you can edit it before publishing. You can also set 
              word count preferences and enable/disable image generation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Is my data secure?
            </h3>
            <p className="text-muted-foreground">
              Absolutely. We use industry-standard encryption, secure API credential storage, and follow 
              GDPR compliance standards. See our Privacy Policy for details.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Explore our comprehensive documentation for detailed guides, API references, and best practices.
          </p>
          <Button variant="outline" asChild data-testid="button-documentation">
            <a href="/docs" target="_blank" rel="noopener noreferrer">
              View Documentation
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <span className="text-sm text-muted-foreground">All systems operational</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Check our status page for real-time updates: 
            <a href="https://status.rankforge.com" className="text-primary hover:underline ml-1">
              status.rankforge.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
