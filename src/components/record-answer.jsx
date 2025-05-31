import { useAuth } from "@clerk/clerk-react";
import {
    CircleStop,
    Loader,
    Mic,
    RefreshCw,
    Video,
    VideoOff,
    WebcamIcon,
    Trash2,
    SaveIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner"; // <-- import Toaster here
import { chatSession } from "@/scripts";
import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { Button } from "@/components/ui/button.jsx";

export const RecordAnswer = ({
                                 question,
                                 isWebCam,
                                 setIsWebCam,
                                 onAnswerSaved,
                             }) => {
    const {
        interimResult,
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false,
    });

    const [userAnswer, setUserAnswer] = useState("");
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasAnswer, setHasAnswer] = useState(false);
    const [existingAnswerId, setExistingAnswerId] = useState(null);

    const { userId } = useAuth();
    const { interviewId } = useParams();

    useEffect(() => {
        if (!userId || !question) return;

        const checkAnswered = async () => {
            const q = query(
                collection(db, "userAnswers"),
                where("userId", "==", userId),
                where("question", "==", question.question),
                where("mockIdRef", "==", interviewId)
            );

            const snap = await getDocs(q);
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                setHasAnswer(true);
                setExistingAnswerId(snap.docs[0].id);
                setUserAnswer(docData.user_ans || "");
                setAiResult({
                    feedback: docData.feedback,
                    ratings: docData.rating,
                });
            } else {
                setHasAnswer(false);
                setExistingAnswerId(null);
                setUserAnswer("");
                setAiResult(null);
            }
        };

        checkAnswered();
    }, [userId, question, interviewId]);

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

    useEffect(() => {
        const processTranscript = async () => {
            const rawTranscript = results
                .filter((result) => typeof result !== "string")
                .map((result) => result.transcript)
                .join(" ");

            if (rawTranscript.length > 0) {
                const cleaned = await cleanUpUserAnswer(rawTranscript);
                setUserAnswer(cleaned);
            }
        };

        processTranscript();
    }, [results]);

    const generateResult = async (qst, qstAns, userAns) => {
        setIsAiGenerating(true);
        const prompt = `
Question: "${qst}"
User Answer: "${userAns}"
Correct Answer: "${qstAns}"
Please compare the user's answer to the correct answer, and provide a rating (from 1 to 10) based on answer quality, and offer feedback for improvement.
Return the result in JSON format with the fields "ratings" (number) and "feedback" (string).
       `.trim();

        try {
            const aiResult = await chatSession.sendMessage(prompt);
            return cleanJsonResponse(aiResult.response.text());
        } catch (error) {
            console.error("Error generating AI result:", error);
            toast.error("An error occurred while generating feedback.");
            return { ratings: 0, feedback: "Unable to generate feedback" };
        } finally {
            setIsAiGenerating(false);
        }
    };

    const cleanJsonResponse = (responseText) => {
        let cleanText = responseText.trim();
        cleanText = cleanText.replace(/(json|```|`)/gi, "");

        try {
            return JSON.parse(cleanText);
        } catch (error) {
            throw new Error("Invalid JSON format: " + error.message);
        }
    };

    const recordUserAnswer = async () => {
        if (hasAnswer) {
            toast.info(
                "You have already answered this question. Delete the existing answer to record again."
            );
            return;
        }

        if (isRecording) {
            stopSpeechToText();

            if (userAnswer?.length < 30) {
                toast.error("Error: Your answer should be more than 30 characters.");
                return;
            }

            const aiRes = await generateResult(
                question.question,
                question.answer,
                userAnswer
            );

            setAiResult(aiRes);
        } else {
            startSpeechToText();
        }
    };

    const recordNewAnswer = () => {
        if (hasAnswer) {
            toast.info("Delete the existing answer before recording again.");
            return;
        }

        stopSpeechToText(); // Stop any ongoing recording

        // Reset all states before recording again
        setUserAnswer("");
        setAiResult(null);
        setLoading(false);
        setIsAiGenerating(false);
        results.length = 0; // Clear previous speech-to-text results if needed

        // Start fresh recording
        startSpeechToText();
    };


    const saveUserAnswer = async () => {
        if (hasAnswer) {
            toast.info(
                "You have already answered this question. Delete it to save a new answer."
            );
            return;
        }

        if (!aiResult) {
            toast.error(
                "Please record your answer and generate feedback before saving."
            );
            return;
        }

        // Confirm save with toast
        toast(
            "Confirm Save?",
            {
                description: "Click 'Save' below to confirm.",
                action: {
                    label: "Save",
                    onClick: async () => {
                        setLoading(true);
                        try {
                            const docRef = await addDoc(collection(db, "userAnswers"), {
                                mockIdRef: interviewId,
                                question: question.question,
                                correct_ans: question.answer,
                                user_ans: userAnswer,
                                feedback: aiResult.feedback,
                                rating: aiResult.ratings,
                                userId,
                                createdAt: serverTimestamp(),
                            });
                            toast.success("Your answer has been saved.");
                            setHasAnswer(true);
                            setExistingAnswerId(docRef.id);
                            if (onAnswerSaved) onAnswerSaved(question.question);
                        } catch (error) {
                            toast.error("An error occurred while saving your answer.");
                            console.error("Save error:", error);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            }
        );
    };

    const deleteAnswer = async () => {
        if (!existingAnswerId) {
            toast.error("No saved answer found to delete.");
            return;
        }

        try {
            stopSpeechToText();

            await deleteDoc(doc(db, "userAnswers", existingAnswerId));
            toast.success("Answer deleted. You can now record a new answer.");


            setHasAnswer(false);
            setExistingAnswerId(null);
            setUserAnswer("");
            setAiResult(null);
            setLoading(false);
            setIsAiGenerating(false);


            if (Array.isArray(results)) {
                results.length = 0;
            }

        } catch (error) {
            toast.error("Failed to delete the answer. Try again later.");
            console.error("Delete error:", error);
        }
    };


    return (
        <div className="w-full flex flex-col items-center gap-8 mt-4 relative">

            <div className="relative w-full h-[400px] md:w-96 border p-2 bg-gray-50 rounded-md overflow-hidden z-10">
                {isWebCam ? (
                    <div className="absolute inset-0 z-10">
                        <WebCam
                            onUserMedia={() => setIsWebCam(true)}
                            onUserMediaError={() => setIsWebCam(false)}
                            className="w-full h-full object-cover rounded-md"
                            videoConstraints={{
                                facingMode: "user",
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <WebcamIcon className="w-24 h-24 text-muted-foreground" />
                    </div>
                )}
            </div>

            {hasAnswer && (
                <div className="w-full max-w-md bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative z-20">
                    <strong>Note:</strong> You have already recorded an answer for this
                    question. To record again, please delete the existing answer below.
                </div>
            )}

            <div className="flex justify-center gap-3 z-20">
                <Button variant="outline" onClick={() => setIsWebCam(!isWebCam)} size="sm">
                    {isWebCam ? <VideoOff /> : <Video />}
                </Button>

                {!hasAnswer && (
                    <>
                        <Button variant="outline" onClick={recordUserAnswer} size="sm">
                            {isRecording ? <CircleStop /> : <Mic />}
                        </Button>
                        <Button variant="outline" onClick={recordNewAnswer} size="sm">
                            <RefreshCw />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={saveUserAnswer}
                            disabled={!aiResult || loading}
                            size="sm"
                        >
                            {isAiGenerating || loading ? (
                                <Loader className="animate-spin" />
                            ) : (
                                <SaveIcon />
                            )}
                        </Button>
                    </>
                )}

                {hasAnswer && (
                    <Button
                        variant="outline"
                        onClick={deleteAnswer}
                        disabled={loading}
                        size="sm"
                        className="text-red-700 border-red-700 hover:text-red-900"
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>

            <div className="w-full mt-4 p-4 border rounded-md bg-gray-50 z-20">
                <h2 className="text-lg font-semibold">Your Answer:</h2>
                <p className="text-sm mt-2 text-gray-700 whitespace-normal">
                    {userAnswer || "Start recording to see your answer here"}
                </p>
                {interimResult && !hasAnswer && (
                    <p className="text-sm text-gray-500 mt-2">
                        <strong>Current Speech:</strong> {interimResult}
                    </p>
                )}
            </div>
        </div>
    );
};
