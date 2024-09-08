
import { config } from 'dotenv'
import OpenAI from "openai";

config()

const openai = new OpenAI({apiKey: process.env.API_KEY_CGPT});
const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        {"role": "user", "content": "Погадай на таро карте маг, вопрос я сексуален?"}
    ]
});

// console.log("completion: ", completion)
console.log(completion.choices[0].message.content);