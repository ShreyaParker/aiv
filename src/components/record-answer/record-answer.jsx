import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

import { fetchExistingAnswer, saveAnswerToDB, deleteAnswerFromDB } from "./services/answerService";
import { generateResult } from "./services/aiService";
import { useSpeechProcessing } from "./hooks/useSpeechProcessing";
import { drawPredictions } from "./utils/drawPredictions";
import { WebcamBox } from "./components/WebcamBox";
import { ControlButtons } from "./components/ControlButton";

export const RecordAnswer = ({ question, isWebCam, setIsWebCam, section, onAnswerSaved }) => {
    const { userId } = useAuth();
    const { interviewId } = useParams();
    const [ignoreOldResults, setIgnoreOldResults] = useState(false);
    const [detectedObjects, setDetectedObjects] = useState([]);

    const [userAnswer, setUserAnswer] = useState("");
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasAnswer, setHasAnswer] = useState(false);
    const [existingAnswerId, setExistingAnswerId] = useState(null);
    const [personDetected, setPersonDetected] = useState(false);
    const [cellPhoneDetected, setCellPhoneDetected] = useState(false); // New state
    const [model, setModel] = useState(null);
    const [resetSpeechProcessing, setResetSpeechProcessing] = useState(0);

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

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);


    useEffect(() => {
        cocoSsd.load()
            .then(setModel)
            .catch(console.error);
    }, []);


    useEffect(() => {
        if (!model || !isWebCam) return;

        const interval = setInterval(async () => {
            if (webcamRef.current && webcamRef.current.video.readyState === 4) {
                const video = webcamRef.current.video;
                const predictions = await model.detect(video);


                drawPredictions(predictions, canvasRef.current, video);


                const detected = predictions
                    .filter(p => {
                        if (p.class === "person") return p.score > 0.4;
                        if (p.class === "cell phone") return p.score > 0.3; // Adjust threshold here
                        return p.score > 0.15;
                    })
                    .map(p => p.class);

                setPersonDetected(detected.includes("person"));
                setCellPhoneDetected(detected.includes("cell phone"));
                setDetectedObjects(detected);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [model, isWebCam]);

    // Check if answer exists in Firestore
    useEffect(() => {
        if (!userId || !question) return;

        const checkAnswered = async () => {
            const snap = await fetchExistingAnswer(userId, question.question, interviewId);
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                setHasAnswer(true);
                setExistingAnswerId(snap.docs[0].id);
                setUserAnswer(docData.user_ans || "");
                setAiResult({ feedback: docData.feedback, ratings: docData.rating });
            } else {
                setHasAnswer(false);
                setExistingAnswerId(null);
                setUserAnswer("");
                setAiResult(null);
            }
        };

        checkAnswered();
    }, [userId, question, interviewId]);

    useSpeechProcessing({ results, setUserAnswer, question, resetSignal: resetSpeechProcessing, ignoreOldResults });

    const recordUserAnswer = async () => {
        if (hasAnswer) {
            toast.info("You have already answered this question. Delete the existing answer to record again.");
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
                userAnswer,
                section,
                setIsAiGenerating
            );
            setAiResult(aiRes);
        } else {
            setIgnoreOldResults(false);
            startSpeechToText();
        }
    };

    const recordNewAnswer = () => {
        if (hasAnswer) {
            toast.info("Delete the existing answer before refreshing.");
            return;
        }

        stopSpeechToText();

        setUserAnswer("");
        setAiResult(null);
        setLoading(false);
        setIsAiGenerating(false);

        setIgnoreOldResults(true);
        setResetSpeechProcessing(prev => prev + 1);
    };

    const saveUserAnswer = async () => {
        if (hasAnswer) {
            toast.info("You have already answered this question. Delete it to save a new answer.");
            return;
        }
        if (!aiResult) {
            toast.error("Please record your answer and generate feedback before saving.");
            return;
        }
        console.log("Objects detected before save:", detectedObjects);

        toast("Confirm Save?", {
            description: "Click 'Save' below to confirm.",
            action: {
                label: "Save",
                onClick: async () => {
                    setLoading(true);
                    try {
                        const docRef = await saveAnswerToDB({
                            mockIdRef: interviewId,
                            section,
                            question: question.question,
                            correct_ans: question.answer,
                            user_ans: userAnswer,
                            feedback: aiResult.feedback,
                            rating: aiResult.ratings,
                            userId,
                            personDetectedDuringRecording: personDetected,
                            objectDetected: [...new Set(detectedObjects)], // unique objects
                        });

                        toast.success("Your answer has been saved.");
                        setHasAnswer(true);
                        setExistingAnswerId(docRef.id);
                        if (onAnswerSaved) onAnswerSaved(question.question);
                    } catch (error) {
                        toast.error("An error occurred while saving your answer.");
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                },
            },
        });
    };

    const deleteAnswer = async () => {
        if (!existingAnswerId) {
            toast.error("No saved answer found to delete.");
            return;
        }

        try {
            stopSpeechToText();
            await deleteAnswerFromDB(existingAnswerId);
            toast.success("Answer deleted. You can now record a new answer.");
            setHasAnswer(false);
            setExistingAnswerId(null);
            setUserAnswer("");
            setAiResult(null);
            setLoading(false);
            setIsAiGenerating(false);
        } catch (error) {
            toast.error("Failed to delete the answer. Try again later.");
            console.error(error);
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-8 mt-4 relative">
            <WebcamBox webcamRef={webcamRef} canvasRef={canvasRef} isWebCam={isWebCam} setIsWebCam={setIsWebCam} />

            <div>
                {isWebCam && (
                    <div>
                        {personDetected ? (
                            <p className="text-green-600 font-semibold">Person detected ✅</p>
                        ) : (
                            <p className="text-red-600 font-semibold">No person detected. Please adjust your camera.</p>
                        )}
                        {cellPhoneDetected ? (
                            <p className="text-green-600 font-semibold">Cell phone detected ✅</p>
                        ) : (
                            <p className="text-red-600 font-semibold">No cell phone detected.</p>
                        )}
                    </div>
                )}
            </div>

            {hasAnswer && (
                <div className="w-full max-w-md bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative z-20">
                    <strong>Note:</strong> You have already recorded an answer for this question. To record again, please delete the existing answer below.
                </div>
            )}

            <ControlButtons
                isWebCam={isWebCam}
                setIsWebCam={setIsWebCam}
                isRecording={isRecording}
                hasAnswer={hasAnswer}
                recordUserAnswer={recordUserAnswer}
                recordNewAnswer={recordNewAnswer}
                saveUserAnswer={saveUserAnswer}
                deleteAnswer={deleteAnswer}
                loading={loading}
                aiResult={aiResult}
                isAiGenerating={isAiGenerating}
            />

            <div className="w-full mt-4 p-4 border rounded-md bg-gray-50 z-20">
                <h2 className="text-lg font-semibold">Your Answer:</h2>
                <p className="text-sm mt-2 text-gray-700 whitespace-normal">{userAnswer || "Start recording to see your answer here"}</p>
                {interimResult && !hasAnswer && (
                    <p className="text-sm text-gray-500 mt-2">
                        <strong>Current Speech:</strong> {interimResult}
                    </p>
                )}
            </div>
        </div>
    );
};
