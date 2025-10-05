import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const platformOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get OpenAI instance - use user's key if provided and they're on paid plan, otherwise use platform key
function getOpenAIInstance(userApiKey?: string | null, useOwnKey: boolean = false): OpenAI {
  if (useOwnKey && userApiKey) {
    return new OpenAI({ apiKey: userApiKey });
  }
  return platformOpenAI;
}

interface GeneratedPost {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  headings: Array<{ level: number; text: string }>;
}

interface GeneratedImage {
  url: string;
  altText: string;
}

export async function generateSEOContent(
  keyword: string,
  targetLength: number = 2000,
  userApiKey?: string | null,
  useOwnKey: boolean = false
): Promise<GeneratedPost> {
  const openai = getOpenAIInstance(userApiKey, useOwnKey);
  const prompt = `Create an SEO-optimized blog post for the keyword "${keyword}". 
  
  Requirements:
  - Target length: ${targetLength} words
  - Include H1, H2, and H3 headings
  - Meta title (50-60 characters)
  - Meta description (150-160 characters)
  - Naturally incorporate LSI keywords related to "${keyword}"
  - Include internal linking opportunities
  - Make content engaging, informative, and valuable
  - Use proper semantic heading hierarchy
  
  Respond with JSON in this format:
  {
    "title": "Main H1 Title",
    "metaTitle": "SEO Meta Title",
    "metaDescription": "SEO Meta Description",
    "content": "Full article content with proper markdown formatting",
    "headings": [
      {"level": 1, "text": "Main Title"},
      {"level": 2, "text": "Section Title"},
      {"level": 3, "text": "Subsection Title"}
    ]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SEO content writer. Create engaging, well-structured, and SEO-optimized content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    if (!response.choices || !response.choices[0]?.message?.content) {
      throw new Error("Invalid OpenAI response: no content generated");
    }

    let content = response.choices[0].message.content;
    
    // Remove markdown code blocks if present (```json ... ```)
    content = content.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error(`Failed to parse OpenAI response as JSON: ${(parseError as Error).message}`);
    }
    
    if (!result.title || !result.content) {
      throw new Error("Generated content missing required fields");
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("max_tokens")) {
      throw new Error("Content too long for generation. Try reducing word count.");
    }
    throw new Error(`Content generation failed: ${(error as Error).message}`);
  }
}

export async function generateImage(
  description: string,
  userApiKey?: string | null,
  useOwnKey: boolean = false
): Promise<GeneratedImage> {
  const openai = getOpenAIInstance(userApiKey, useOwnKey);
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a high-quality, professional image for a blog post: ${description}. Make it visually appealing and relevant to the content.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || !response.data[0]?.url) {
      throw new Error("Invalid image generation response");
    }

    const imageUrl = response.data[0].url;
    
    const altTextPrompt = `Generate a descriptive, SEO-friendly alt text (max 125 characters) for an image with this description: ${description}`;
    const altResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: altTextPrompt,
        },
      ],
      max_completion_tokens: 100,
    });

    const altText = altResponse.choices[0]?.message?.content?.trim() || description;

    return {
      url: imageUrl,
      altText: altText.slice(0, 125),
    };
  } catch (error) {
    throw new Error(`Image generation failed: ${(error as Error).message}`);
  }
}

export async function generateMultipleImages(
  descriptions: string[],
  userApiKey?: string | null,
  useOwnKey: boolean = false
): Promise<GeneratedImage[]> {
  const imagePromises = descriptions.map((desc) => generateImage(desc, userApiKey, useOwnKey));
  return Promise.all(imagePromises);
}
