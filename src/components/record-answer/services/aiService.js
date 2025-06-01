import { chatSession } from "@/scripts";
import { toast } from "sonner";

export const generateResult = async (
    question,
    correctAns,
    userAns,
    section,
    setIsAiGenerating
) => {
    setIsAiGenerating(true);

    const prompt = `
You are an expert interviewer providing feedback for a mock interview answer. The interview section is "${section}".

Question: "${question}"
User Answer: "${userAns}"
Correct Answer: "${correctAns}"

Please compare the user's answer to the correct answer, provide a rating (from 1 to 10) based on answer quality, and offer detailed feedback tailored for the "${section}" section. 
Return the result in JSON format with the fields "ratings" (number) and "feedback" (string).
  `.trim();

    try {
        const response = await chatSession.sendMessage(prompt);
        const rawText = await response.response.text();

        return cleanJsonResponse(rawText);
    } catch (error) {
        console.error("Error generating AI result:", error);
        toast.error("An error occurred while generating feedback.");
        return { ratings: 0, feedback: "Unable to generate feedback." };
    } finally {
        setIsAiGenerating(false);
    }
};

const cleanJsonResponse = (text) => {
    try {
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
        const match = text.match(codeBlockRegex);
        let jsonString = match ? match[1].trim() : text.trim();

        jsonString = jsonString
            .replace(/[\u0000-\u001F]+/g, "")  // Remove control chars
            .replace(/\r?\n/g, " ");           // Replace newlines with spaces for safety

         const jsonStart = jsonString.indexOf("{");
        const jsonEnd = jsonString.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
            throw new Error("Could not find valid JSON block.");
        }

        jsonString = jsonString.slice(jsonStart, jsonEnd + 1);

        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Raw AI response (failed to parse):", text);
        throw new Error("Invalid AI JSON: " + e.message);
    }
};
