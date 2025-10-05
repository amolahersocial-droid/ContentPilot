import { NavMenu } from "@shopify/app-bridge-react";

export function ShopifyNav() {
  return (
    <NavMenu>
      {/* First element required - not rendered as link */}
      <a href="/dashboard" rel="home">Home</a>
      <a href="/dashboard/sites">Sites</a>
      <a href="/dashboard/keywords">Keywords</a>
      <a href="/dashboard/content">Content</a>
      <a href="/dashboard/backlinks">Backlinks</a>
      <a href="/dashboard/outreach">Outreach</a>
      <a href="/dashboard/settings">Settings</a>
    </NavMenu>
  );
}
