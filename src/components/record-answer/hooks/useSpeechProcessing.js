import { useEffect, useRef } from "react";
import { chatSession } from '@/scripts';

export const useSpeechProcessing = ({
                                        results,
                                        setUserAnswer,
                                        question,
                                        resetSignal,
                                        ignoreOldResults,
                                    }) => {
    const lastResetSignalRef = useRef(resetSignal);
    const lastProcessedLengthRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        const cleanUpUserAnswer = async (rawAnswer) => {
            const prompt = `
You are given a technical question and a transcript of a spoken answer. The transcript may contain:

- Misheard technical terms (e.g., "mon" instead of "MERN", "stek" instead of "stack")
- Minor grammar or punctuation issues due to speech recognition
- Slight repetition or filler words

Your task:
- Fix **misheard technical terms** using the context of the question
- Fix **grammar and punctuation** to make the answer understandable
- **Do not rephrase** or improve the answer beyond fixing misrecognitions and basic grammar

Return only the cleaned-up answer. Do NOT include notes, explanations, or formatting.

Question: "${question.question}"
Transcript: "${rawAnswer}"
Cleaned Answer:
      `.trim();

            try {
                const aiResponse = await chatSession.sendMessage(prompt);
                return aiResponse.response.text().trim();
            } catch (error) {
                console.error("Error cleaning up user answer:", error);
                return rawAnswer;
            }
        };

        const processTranscript = async () => {
            if (ignoreOldResults) {
                lastProcessedLengthRef.current = results.length; // reset
                return;
            }

            const newResults = results.slice(lastProcessedLengthRef.current);
            lastProcessedLengthRef.current = results.length;

            const rawTranscript = newResults
                .filter((r) => typeof r !== "string")
                .map((r) => r.transcript)
                .join(" ")
                .trim();

            if (!rawTranscript) return;

            const cleaned = await cleanUpUserAnswer(rawTranscript);
            if (!cancelled) {
                setUserAnswer((prev) => (prev ? prev + " " + cleaned : cleaned));
            }
        };

        if (lastResetSignalRef.current !== resetSignal) {
            lastResetSignalRef.current = resetSignal;
            lastProcessedLengthRef.current = 0;
        }

        processTranscript();

        return () => {
            cancelled = true;
        };
    }, [results, question, setUserAnswer, resetSignal, ignoreOldResults]);
};
