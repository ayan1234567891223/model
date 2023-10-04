import express from "express";
import fetch from "node-fetch";
import { writeFile } from "fs";
import OpenAI from "openai";
import { downloadImage } from "./download.js";

const app = express();
const apiKey = YOUR_OPENAI_API_KEY;
const apiUrl = "https://api.openai.com/v1/images/generations";

const openai = new OpenAI({ apiKey: apiKey });

app.use(express.urlencoded({ extended: false }));

app.post("/get-answers", async (req, res) => {
  const chatgptresponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content:
          req.body.prompt + " " + "Bold what is important using <b> and </b>.",
      },
    ],
  });

  let chatgptresponsedata = chatgptresponse.choices[0].message.content;

  const chatgptresponse2 = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content:
          chatgptresponsedata +
          " " +
          "Can you describe the topic which I can give for this thing.",
      },
    ],
  });

  const responsey = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: chatgptresponse2.choices[0].message.content,
      n: req.query.n || 1,
      size: req.body.size || "1024x1024",
    }),
  });

  const data = await responsey.json();
  const generatedImage = data;

  res.send(`
  <style>*{font-family:consolas}img{height:500;width:500;}</style>
  ${chatgptresponse.choices[0].message.content}
  <br><br>
  <img src="${generatedImage.data[0].url}" alt="${chatgptresponse2.choices[0].message.content}"></img>
  `);
});

app.post("/generate-image", async (req, res) => {
  const generateImage = async () => {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: req.body.prompt,
        n: req.body.n || 3,
        size: req.query.size || "1024x1024",
      }),
    });

    const data = await response.json();
    const generatedImage = data;
    console.log("Generated Image:", generatedImage.data[0].url);

    res.send(`<img src="${generatedImage.data[0].url}"></img>`);
  };

  generateImage();
});

app.post("/generate-image/automatic", async (req, res) => {
  const responsea = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content:
          "Just give me a sentence to make a picture. The sentence should only be a description. It can be a baroque art, a chiaroscuro, a monochromatic, an analog, renaissance art, surrealism, cubism, anything. For example, A baroque art of a peasent pleading king, or A monochrome of a boat sailing across the river or A monochrome of a boat sailing across the sea.",
      },
    ],
  });

  console.log("Response: ", responsea.choices[0].message.content);

  const generateImage = async () => {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: responsea.choices[0].message.content,
        n: req.query.n || 3,
        size: req.query.size || "1024x1024",
      }),
    });

    const data = await response.json();
    const generatedImage = data;
    console.log("Generated Image:", generatedImage.data[0].url);

    downloadImage(generatedImage.data[0].url, `./images/${Date.now()}.png`);

    res.send(`<img src="${generatedImage.data[0].url}"></img>`);
  };

  generateImage();
});

app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
  <title>
  The AI Place
  </title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
  <form action="/get-answers" method="POST">
  <label for="prompt" class="ml-5">Use ChatGPT with images!</label>
  <input type="text" name="prompt" id="prompt" class="w-1/2 border-2 border-sky-500 focus:border-2 focus:border-red-500 ml-5 p-5 rounded-lg mt-5" hint="Use ChatGPT with images, just type your prompt here!"></input>
  <input type="submit" value="Submit" class="ml-5 rounded-lg p-5 mt-5 text-white bg-blue-500 font-bold">
  </form>
  <form action="/generate-image" method="POST">
  <label for="prompt" class="ml-5">Generate images!</label>
  <input type="text" name="prompt" id="prompt" class="w-1/2 border-2 border-sky-500 focus:border-2 focus:border-red-500 ml-5 p-5 rounded-lg mt-5"></input>
  <input type="submit" name="Submit" class="p-5 bg-blue-500 text-white font-bold p-5 ml-5 rounded-lg"></input>
  </form>
  <form action="/generate-image/automatic" method="POST">
  <label for="prompt" class="ml-5">Generate a random beautiful image</label>
  <input type="submit" name="Submit" class="p-5 bg-blue-500 text-white font-bold p-5 ml-5 rounded-lg"></input>
  </form>
  </body>
  </html>
  `);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
