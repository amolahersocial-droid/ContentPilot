import { storage } from "../storage";

export interface InternalLink {
  title: string;
  url: string;
  keywords: string[];
  headings: string[];
}

export async function getInternalLinkCandidates(
  userId: string,
  siteId: string,
  currentPostId?: string
): Promise<InternalLink[]> {
  try {
    const posts = await storage.getPostsByUserId(userId);
    
    const publishedPosts = posts.filter(
      (p) => 
        p.siteId === siteId && 
        p.status === "published" && 
        p.id !== currentPostId && 
        p.externalPostId
    );

    const site = await storage.getSiteById(siteId);
    if (!site) return [];

    return publishedPosts.map((post) => ({
      title: post.title,
      url: generatePostUrl(site.url, post.externalPostId!),
      keywords: post.keywordId ? [post.keywordId] : [],
      headings: post.headings || [],
    })).slice(0, 10);
  } catch (error) {
    console.error("Error getting internal link candidates:", error);
    return [];
  }
}

function generatePostUrl(siteUrl: string, externalPostId: string): string {
  const cleanUrl = siteUrl.replace(/\/+$/, "");
  return `${cleanUrl}/?p=${externalPostId}`;
}

export function augmentContentWithInternalLinks(
  content: string,
  links: InternalLink[]
): string {
  if (!links.length) return content;

  let modifiedContent = content;

  links.forEach((link) => {
    const keywords = [link.title, ...link.headings];
    
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${escapeRegex(keyword)})\\b`, 'i');
      const match = regex.exec(modifiedContent);
      
      if (match && !modifiedContent.includes(`href="${link.url}"`)) {
        const replacement = `<a href="${link.url}">${match[1]}</a>`;
        modifiedContent = modifiedContent.replace(regex, replacement);
      }
    });
  });

  return modifiedContent;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildInternalLinksPrompt(links: InternalLink[]): string {
  if (!links.length) {
    return "";
  }

  return `\n\nInternal Linking Context:
You have the following published articles on this site that you can reference with internal links where relevant:
${links.map((link, i) => `${i + 1}. "${link.title}" - ${link.url}`).join('\n')}

When writing the content, naturally incorporate 2-3 internal links to these articles where contextually appropriate. Use markdown link syntax [text](url).`;
}
