import fs from 'fs';
const envFile = fs.readFileSync('.env.production', 'utf-8');
const match = envFile.match(/FAL_KEY\s*=\s*(.*)/);
let key = match ? match[1] : null;

// Remove surrounding quotes if they exist
if (key) {
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  } else if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
}
key = key.replace(/\\n/g, '').trim();

async function test() {
  console.log("Using Key:", key.substring(0, 10) + "...");
  const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Authorization": `Key ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt: "Canadian Immigration Test", image_size: "landscape_16_9", num_inference_steps: 4 })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
test();
