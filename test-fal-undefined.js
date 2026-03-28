require('dotenv').config();

(async () => {
    try {
        const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
                "Authorization": `Key undefined`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: "Testing", image_size: "landscape_16_9", num_images: 1 })
        });
        
        console.log("Status:", res.status);
        if (!res.ok) {
            console.error("FAL API Error detail:", await res.text());
        }
    } catch(e) {
        console.error("Network or execution crash:", e);
    }
})();
