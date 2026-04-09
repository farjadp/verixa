require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        console.log("Checking DB connection...", process.env.DATABASE_URL);
        
        // 1. Create a dummy raw article
        const raw = await prisma.rawArticle.create({
            data: {
                title: "Test Article for Image Generation",
                extractedText: "This is a test article about Canadian immigration. It involves a new express entry draw.",
                sourceUrl: "http://example.com/test",
                status: "PENDING",
            }
        });
        
        console.log("Created raw article:", raw.id);
        
        // 2. We can't easily call the Next.js Server Action directly from node because of next-auth and other imports.
        // Let's just create a test Node script that replicates step 5 specifically with the actual FAL API.
        
        const safePrompt = `Professional editorial photography, highly detailed, photorealistic, 8k resolution, cinematic lighting. Subject: Test Canadian Immigration. Clean, uncluttered composition. NO TEXT.`;
        const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: safePrompt, image_size: "landscape_16_9", num_images: 1 })
        });
        
        if (!res.ok) {
            console.error("FAL Error:", await res.text());
        } else {
            const data = await res.json();
            console.log("FAL SUCCESS Image:", data.images?.[0]?.url);
            
            // 3. Try to save it to BlogPost
            const post = await prisma.blogPost.create({
                data: {
                    title: "Test",
                    slug: "test-slug-" + Date.now(),
                    summary: "test",
                    content: "test",
                    category: "NEWS",
                    coverImage: data.images[0].url,
                    publishedAt: new Date()
                }
            });
            console.log("Saved Blog Post with Image:", post.coverImage);
        }
    } catch(e) {
        console.error("Crash:", e);
    } finally {
        await prisma.$disconnect();
    }
})();
