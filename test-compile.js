const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

(async () => {
    try {
        console.log("Using FAL_KEY:", !!process.env.FAL_KEY);
        
        let pending = await prisma.rawArticle.findFirst({ where: { status: 'PENDING' } });
        if (!pending) {
            console.log("No pending articles found to simulate!");
            return;
        }
        
        console.log("Simulating process on:", pending.id, pending.title);

        const safePrompt = `Professional editorial photography, highly detailed, photorealistic, 8k resolution, cinematic lighting. Subject: A diverse business meeting in Ottawa. Clean, uncluttered composition. NO TEXT.`;
        
        console.log("Calling FAL...");
        const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: safePrompt, image_size: "landscape_16_9", num_images: 1 })
        });
        
        if (res.ok) {
            const data = await res.json();
            console.log("✅ Image URL generated simulated:", data.images?.[0]?.url);
        } else {
            console.error("❌ FAL Failed:", res.status, await res.text());
        }
        
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
})();
