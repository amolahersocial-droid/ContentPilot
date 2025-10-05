import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  targetLength: number = 2000
): Promise<GeneratedPost> {
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
      model: "gpt-5",
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
      max_completion_tokens: 8192,
    });

    if (!response.choices || !response.choices[0]?.message?.content) {
      throw new Error("Invalid OpenAI response: no content generated");
    }

    const result = JSON.parse(response.choices[0].message.content);
    
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

export async function generateImage(description: string): Promise<GeneratedImage> {
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
  descriptions: string[]
): Promise<GeneratedImage[]> {
  const imagePromises = descriptions.map((desc) => generateImage(desc));
  return Promise.all(imagePromises);
}
