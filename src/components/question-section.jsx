import { useAuth } from "@clerk/clerk-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { cn } from "@/lib/utils.js";
import { Volume2, VolumeX } from "lucide-react";
import { RecordAnswer } from "@/components/record-answer.jsx";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const QuestionSection = ({ questions, onAnswerSaved, interviewId }) => {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [isWebCam, setIsWebCam] = useState(false);

  const fetchAnsweredQuestions = useCallback(async () => {
    if (!userId || !interviewId) return;

    try {
      const q = query(
          collection(db, "userAnswers"),
          where("userId", "==", userId),
          where("mockIdRef", "==", interviewId)
      );

      const snap = await getDocs(q);
      const answered = snap.docs
          .map((doc) => doc.data().question?.trim().toLowerCase())
          .filter(Boolean);

      setAnsweredQuestions(answered);
    } catch (error) {
      console.error("Failed to fetch answered questions:", error);
    }
  }, [userId, interviewId]);

  useEffect(() => {
    fetchAnsweredQuestions();
  }, [fetchAnsweredQuestions]);

  const handlePlayQuestion = (qst) => {
    if (isPlaying && currentSpeech) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentSpeech(null);
    } else {
      const speech = new SpeechSynthesisUtterance(qst);
      window.speechSynthesis.speak(speech);
      setIsPlaying(true);
      setCurrentSpeech(speech);
      speech.onend = () => {
        setIsPlaying(false);
        setCurrentSpeech(null);
      };
    }
  };

  const onAnswerSavedInternal = (questionText) => {
    const normalized = questionText.trim().toLowerCase();

    setAnsweredQuestions((prev) => {
      if (!prev.includes(normalized)) {
        return [...prev, normalized];
      }
      return prev;
    });

    fetchAnsweredQuestions();

    if (onAnswerSaved) onAnswerSaved(questionText);
  };

  const allAnswered = answeredQuestions.length === questions.length;

  return (
      <div className="w-full min-h-96 border rounded-md p-4">
        <Tabs defaultValue={questions[0]?.question} className="w-full space-y-12" orientation="vertical">
          <TabsList className="bg-transparent w-full flex flex-wrap gap-4">
            {questions.map((tab, i) => {
              const isAnswered = answeredQuestions.includes(tab.question.trim().toLowerCase());
              return (
                  <TabsTrigger
                      key={tab.question}
                      value={tab.question}
                      className={cn(
                          "text-xs px-2 py-1 rounded-md transition",
                          "data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:shadow-sm",
                          isAnswered ? "bg-green-200" : "bg-white"
                      )}
                  >
                    {`Question #${i + 1}`}
                  </TabsTrigger>
              );
            })}

            <TabsTrigger
                value="done"
                className={cn(
                    "text-xs px-2 py-1 rounded-md transition",
                    "data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:shadow-sm"
                )}
            >
              Done
            </TabsTrigger>
          </TabsList>

          {questions.map((tab, i) => (
              <TabsContent key={i} value={tab.question}>
                <p className="text-base text-left tracking-wide text-neutral-500">{tab.question}</p>
                <div className="w-full flex items-center justify-end mb-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayQuestion(tab.question)}
                  >
                    {isPlaying ? <VolumeX /> : <Volume2 />}
                    <span className="ml-2">{isPlaying ? "Stop" : "Play"}</span>
                  </Button>
                </div>

                <RecordAnswer
                    question={tab}
                    onAnswerSaved={onAnswerSavedInternal}
                    answeredQuestions={answeredQuestions}
                    interviewId={interviewId}
                    isWebCam={isWebCam}
                    setIsWebCam={setIsWebCam}
                />
              </TabsContent>
          ))}

          <TabsContent value="done">
            {allAnswered ? (
                <div className="text-center space-y-4">
                  <p className="text-green-700 font-medium">🎉 You've answered all questions!</p>
                  <Button onClick={() => navigate(`/generate/feedback/${interviewId}`)}>
                    Check Your Feedback Now
                  </Button>
                </div>
            ) : (
                <div className="text-center space-y-4">
                  <p className="text-yellow-700 font-medium">⚠️ Some questions are still unanswered.</p>
                  <Button onClick={() => navigate("/generate")}>Go to Dashboard</Button>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default QuestionSection;
