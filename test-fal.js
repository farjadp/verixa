require('dotenv').config();
(async () => {
  try {
    const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: "A sleek black sports car on a wet neon lit street", image_size: "landscape_16_9", num_images: 1, safety_tolerance: "2" })
    });
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
})();
