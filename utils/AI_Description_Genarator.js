import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import multer from 'multer';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
});

export const upload = multer({ storage: storage });


export const generateDescription = async (image, prompt) => {

    const contents = [{
        role: "user", parts: [{
            inlineData: {
                data: Buffer.from(fs.readFileSync(image)).toString("base64"),
                mimeType: "image/png",
            },
        }, { text: prompt }]
    }];

    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent({ contents });

        return result?.response?.candidates[0]?.content?.parts[0]?.text;

    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
};

export default generateDescription;
























// import { GoogleGenerativeAI } from '@google/generative-ai';

// const generateDescription = async (image, prompt) => {

//     const contents = [{
//         role: "user", parts: [{
//             inlineData: {
//                 data: Buffer.from(fs.readFileSync("cookie.png")).toString("base64"),
//                 mimeType: "image/png",
//             },
//         }, { text: prompt }]
//     }]
//     const genAI = new GoogleGenerativeAI(process.env.API_KEY);

//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const result = model.generateContentStream({ contents })
//     return result;
// }