import { useAuth } from "@clerk/clerk-react";
import {
    CircleStop,
    Loader,
    Mic,
    RefreshCw,

    Video,
    VideoOff,
    WebcamIcon,
    Trash2, SaveIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { toast } from "sonner";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";

export const RecordAnswer = ({ question, isWebCam, setIsWebCam, onAnswerSaved }) => {
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
    const [open, setOpen] = useState(false);
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
                setHasAnswer(true);
                setExistingAnswerId(snap.docs[0].id);
                setUserAnswer(snap.docs[0].data().user_ans || "");
                setAiResult({
                    feedback: snap.docs[0].data().feedback,
                    ratings: snap.docs[0].data().rating,
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
You are given the following question and a user answer that might contain errors due to speech recognition mishearing.

Question: "${question.question}"

Please carefully improve the grammar, punctuation, and clarity of the user's answer without changing its meaning.

Additionally, detect any difficult or technical terms that may have been misheard or transcribed incorrectly by speech recognition. Correct these terms based on the context of both the question and the answer.

Return ONLY the cleaned-up and corrected answer text. Do NOT add any explanations, notes, or commentary.
Answer: "${rawAnswer}"
`;
        try {
            const aiResponse = await chatSession.sendMessage(prompt);
            return aiResponse.response.text().trim();
        } catch (error) {
            console.error("Error cleaning up user answer:", error);
            return rawAnswer;
        }
    };

    const recordUserAnswer = async () => {
        if (hasAnswer) {
            toast.info("You have already answered this question. Delete the existing answer to record again.");
            return;
        }

        if (isRecording) {
            stopSpeechToText();

            if (userAnswer?.length < 30) {
                toast.error("Error: Your answer should be more than 30 characters");
                return;
            }

            const cleanedAnswer = await cleanUpUserAnswer(userAnswer);
            setUserAnswer(cleanedAnswer);

            const aiRes = await generateResult(
                question.question,
                question.answer,
                cleanedAnswer
            );

            setAiResult(aiRes);
        } else {
            startSpeechToText();
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

    const generateResult = async (qst, qstAns, userAns) => {
        setIsAiGenerating(true);
        const prompt = `
      Question: "${qst}"
      User Answer: "${userAns}"
      Correct Answer: "${qstAns}"
      Please compare the user's answer to the correct answer, and provide a rating (from 1 to 10) based on answer quality, and offer feedback for improvement.
      Return the result in JSON format with the fields "ratings" (number) and "feedback" (string).
    `;

        try {
            const aiResult = await chatSession.sendMessage(prompt);
            const parsedResult = cleanJsonResponse(aiResult.response.text());
            return parsedResult;
        } catch (error) {
            console.log(error);
            toast.error("An error occurred while generating feedback.");
            return { ratings: 0, feedback: "Unable to generate feedback" };
        } finally {
            setIsAiGenerating(false);
        }
    };

    const recordNewAnswer = () => {
        if (hasAnswer) {
            toast.info("Delete the existing answer before recording again.");
            return;
        }
        setUserAnswer("");
        stopSpeechToText();
        startSpeechToText();
    };

    const saveUserAnswer = async () => {
        if (hasAnswer) {
            toast.info("You have already answered this question. Delete it to save a new answer.");
            return;
        }

        setLoading(true);

        if (!aiResult) {
            toast.error("Please record your answer and generate feedback before saving.");
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "userAnswers"), {
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
            setOpen(false);

            if (onAnswerSaved) {
                onAnswerSaved(question.question);
            }
        } catch (error) {
            toast.error("An error occurred while saving your answer.");
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const deleteAnswer = async () => {
        if (!existingAnswerId) {
            toast.error("No saved answer found to delete.");
            return;
        }

        try {
            await deleteDoc(doc(db, "userAnswers", existingAnswerId));
            toast.success("Answer deleted. You can now record a new answer.");

            setHasAnswer(false);
            setExistingAnswerId(null);
            setUserAnswer("");
            setAiResult(null);
        } catch (error) {
            toast.error("Failed to delete the answer. Try again later.");
            console.log(error);
        }
    };

    useEffect(() => {
        const combineTranscripts = results
            .filter((result) => typeof result !== "string")
            .map((result) => result.transcript)
            .join(" ");

        setUserAnswer(combineTranscripts);
    }, [results]);

    return (
        <div className="w-full flex flex-col items-center gap-8 mt-4">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md z-50">
                    <DialogHeader>
                        <DialogTitle>Save Your Answer</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to save your answer? Once saved, you won't be able to modify it.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={saveUserAnswer} disabled={loading}>
                            {loading ? "Saving..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {open && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md z-[10000]">
                        <h2 className="text-lg font-semibold">Save Your Answer</h2>
                        <p className="text-sm text-gray-700 mt-2 mb-4">
                            Are you sure you want to save your answer? Once saved, it cannot be changed.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                onClick={saveUserAnswer}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-[400px] md:w-96 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
                {isWebCam ? (
                    <WebCam
                        onUserMedia={() => setIsWebCam(true)}
                        onUserMediaError={() => setIsWebCam(false)}
                        className="w-full h-full object-cover rounded-md"
                        style={{ zIndex: 0, position: "relative" }}
                    />
                ) : (
                    <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
                )}
            </div>

            {hasAnswer && (
                <div className="w-full max-w-md bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative">
                    <strong>Note:</strong> You have already recorded an answer for this question.
                    To record again, please delete the existing answer below.
                </div>
            )}

            <div className="flex justify-center gap-3">
                <Button
                    variant="outline"
                    onClick={() => setIsWebCam(!isWebCam)}
                    size="sm"
                >
                    {isWebCam ? <VideoOff /> : <Video />}
                </Button>

                {!hasAnswer && (
                    <>
                        <Button
                            variant="outline"
                            onClick={recordUserAnswer}
                            size="sm"
                        >
                            {isRecording ? <CircleStop /> : <Mic />}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={recordNewAnswer}
                            size="sm"
                        >
                            <RefreshCw />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(true)}
                            disabled={!aiResult}
                            size="sm"

                        >
                            {isAiGenerating ? <Loader className="animate-spin" /> : <SaveIcon />}
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

            <div className="w-full mt-4 p-4 border rounded-md bg-gray-50">
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
