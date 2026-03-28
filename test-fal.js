require('dotenv').config();

(async () => {
    console.log("Testing FAL API with flux/schnell...");
    console.log("KEY present?", !!process.env.FAL_KEY);
    
    try {
        const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                prompt: "Professional editorial photography, highly detailed, photorealistic, 8k resolution, cinematic lighting. Subject: A diverse board of directors analyzing a document. Clean, uncluttered composition. NO TEXT.", 
                image_size: "landscape_16_9", 
                num_images: 1 
            })
        });

        console.log("Status:", res.status);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error("FAL API Error detail:", errorText);
            return;
        }

        const data = await res.json();
        console.log("Success! Image URL:", data.images?.[0]?.url);
    } catch(e) {
        console.error("Network or execution crash:", e);
    }
})();
