import { NavMenu } from "@shopify/app-bridge-react";

export function ShopifyNav() {
  return (
    <NavMenu>
      {/* First element required - not rendered as link */}
      <a href="/" rel="home">Home</a>
      <a href="/sites">Sites</a>
      <a href="/content">Content</a>
      <a href="/seo">SEO Validator</a>
      <a href="/backlinks">Backlinks</a>
      <a href="/settings">Settings</a>
    </NavMenu>
  );
}
